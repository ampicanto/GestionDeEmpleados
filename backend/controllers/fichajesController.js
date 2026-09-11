const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

function distanciaEnMetros(lat1, lng1, lat2, lng2) {
  const radioTierra = 6371000
  const aLat = (lat2 - lat1) * Math.PI / 180
  const aLng = (lng2 - lng1) * Math.PI / 180
  const formula = Math.sin(aLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(aLng / 2) ** 2
  return 2 * radioTierra * Math.atan2(Math.sqrt(formula), Math.sqrt(1 - formula))
}

async function obtenerProyectosAsignados(usuarioId) {
  const [userRows] = await pool.query('SELECT nombre FROM usuarios WHERE id = ? AND activo = TRUE', [usuarioId])
  if (!userRows[0]) return []

  const [projectRows] = await pool.query(
    'SELECT id, name, assigned_employees, jornada, lat, lng, radius_m FROM projects'
  )

  return projectRows.filter((project) => {
    try {
      const empleados = project.assigned_employees ? JSON.parse(project.assigned_employees) : []
      return empleados.includes(userRows[0].nombre)
    } catch {
      return false
    }
  })
}

function encontrarProyectoEnRadio(projects, lat, lng) {
  return projects.find((project) => {
    if (!Number.isFinite(Number(project.lat)) || !Number.isFinite(Number(project.lng))) return false
    const distancia = distanciaEnMetros(lat, lng, Number(project.lat), Number(project.lng))
    return distancia <= Number(project.radius_m || 50)
  })
}

function obtenerMinutosInicio(jornada) {
  const times = String(jornada || '').match(/\d{1,2}\s*[:.]\s*\d{2}/g)
  if (!times?.length) return null
  const match = times[0].match(/(\d{1,2})\s*[:.]\s*(\d{2})/)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function obtenerMinutosFin(jornada) {
  const times = String(jornada || '').match(/\d{1,2}\s*[:.]\s*\d{2}/g)
  if (!times || times.length < 2) return null
  const match = times[1].match(/(\d{1,2})\s*[:.]\s*(\d{2})/)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

async function registrarInasistenciaSiCorresponde(usuarioId) {
  const proyectos = await obtenerProyectosAsignados(usuarioId)
  const endTimes = proyectos.map((project) => obtenerMinutosFin(project.jornada)).filter((time) => time !== null)
  if (!endTimes.length) return

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  if (currentMinutes < Math.max(...endTimes)) return

  const [fichajes] = await pool.query(
    'SELECT id FROM fichajes WHERE usuario_id = ? AND DATE(fecha_hora) = CURDATE() AND eliminado = FALSE LIMIT 1',
    [usuarioId]
  )
  if (fichajes.length) return

  const [ausencias] = await pool.query(
    'SELECT id FROM ausencias WHERE usuario_id = ? AND fecha_inicio <= CURDATE() AND fecha_fin >= CURDATE() LIMIT 1',
    [usuarioId]
  )
  if (!ausencias.length) {
    await pool.query(
      `INSERT INTO ausencias (usuario_id, tipo, fecha_inicio, fecha_fin, observaciones)
       VALUES (?, 'falta_injustificada', CURDATE(), CURDATE(), ?)`,
      [usuarioId, 'No se registró asistencia durante la jornada']
    )
  }
}

async function registrarSalidasAutomaticas() {
  const [entradas] = await pool.query(
    `SELECT f.id, f.usuario_id, f.local_id, f.latitud, f.longitud, u.nombre
     FROM fichajes f
     INNER JOIN usuarios u ON u.id = f.usuario_id
     WHERE f.tipo = 'entrada'
       AND f.eliminado = FALSE
       AND u.rol_id = 3
       AND u.activo = TRUE
       AND DATE(f.fecha_hora) = CURDATE()
       AND NOT EXISTS (
         SELECT 1 FROM fichajes siguiente
         WHERE siguiente.usuario_id = f.usuario_id
           AND siguiente.tipo = 'salida'
           AND siguiente.eliminado = FALSE
           AND DATE(siguiente.fecha_hora) = CURDATE()
           AND siguiente.fecha_hora > f.fecha_hora
       )
     ORDER BY f.fecha_hora DESC`
  )
  if (!entradas.length) return 0

  const [projects] = await pool.query('SELECT name, assigned_employees, jornada FROM projects')
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  let salidasRegistradas = 0

  for (const entrada of entradas) {
    const jornadas = projects
      .filter((project) => {
        try {
          const empleados = project.assigned_employees ? JSON.parse(project.assigned_employees) : []
          return empleados.includes(entrada.nombre)
        } catch {
          return false
        }
      })
      .map((project) => obtenerMinutosFin(project.jornada))
      .filter((time) => time !== null)
    const endMinutes = jornadas.length ? Math.max(...jornadas) : null
    if (endMinutes === null || currentMinutes < endMinutes) continue

    const [result] = await pool.query(
      `INSERT INTO fichajes (usuario_id, local_id, tipo, es_hora_extra, latitud, longitud, dentro_del_radio, foto_data)
       SELECT ?, ?, 'salida', FALSE, ?, ?, TRUE, NULL
       WHERE NOT EXISTS (
         SELECT 1 FROM fichajes
         WHERE usuario_id = ? AND tipo = 'salida' AND eliminado = FALSE AND DATE(fecha_hora) = CURDATE()
       )`,
      [entrada.usuario_id, entrada.local_id, entrada.latitud, entrada.longitud, entrada.usuario_id]
    )
    salidasRegistradas += result.affectedRows
  }

  return salidasRegistradas
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Sesión no válida' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ ok: false, message: 'La autenticación no está configurada' })
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Sesión expirada' })
  }
}

async function registrarFichaje(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden registrar asistencia' })
    }

    const { foto, latitud, longitud } = req.body
    const usuarioId = req.usuario.id

    if (!foto || typeof foto !== 'string' || !foto.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, message: 'La selfie es obligatoria' })
    }

    if (!Number.isFinite(Number(latitud)) || !Number.isFinite(Number(longitud))) {
      return res.status(400).json({ ok: false, message: 'La ubicación es obligatoria' })
    }

    const lat = Number(latitud)
    const lng = Number(longitud)
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ ok: false, message: 'La ubicación no es válida' })
    }

    const proyectosAsignados = await obtenerProyectosAsignados(req.usuario.id)
    const proyectoEnRadio = encontrarProyectoEnRadio(proyectosAsignados, lat, lng)
    if (!proyectoEnRadio) {
      return res.status(403).json({
        ok: false,
        code: 'OUTSIDE_PROJECT_RADIUS',
        message: proyectosAsignados.length
          ? 'No estás dentro del radio de ningún proyecto asignado'
          : 'No tienes proyectos asignados para registrar asistencia',
      })
    }

    const startMinutes = obtenerMinutosInicio(proyectoEnRadio.jornada)
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    if (startMinutes === null || currentMinutes < startMinutes) {
      return res.status(403).json({
        ok: false,
        code: startMinutes === null ? 'SHIFT_NOT_CONFIGURED' : 'SHIFT_NOT_STARTED',
        message: startMinutes === null
          ? 'La jornada del proyecto no está configurada correctamente'
          : `La jornada comienza a las ${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`,
      })
    }

    const connection = await pool.getConnection()
    try {
      const [lastRows] = await connection.query(
        `SELECT tipo, es_hora_extra FROM fichajes
         WHERE usuario_id = ? AND DATE(fecha_hora) = CURDATE() AND eliminado = FALSE
         ORDER BY fecha_hora DESC LIMIT 1`,
        [usuarioId]
      )
      const tipo = lastRows[0]?.tipo === 'entrada' ? 'salida' : 'entrada'
      const endTimes = proyectosAsignados.map((project) => obtenerMinutosFin(project.jornada)).filter((time) => time !== null)
      const jornadaFinalizada = endTimes.length > 0 && currentMinutes > Math.max(...endTimes)
      const esHoraExtra = tipo === 'entrada'
        ? jornadaFinalizada
        : Boolean(lastRows[0]?.es_hora_extra)

      const [result] = await connection.query(
        `INSERT INTO fichajes
          (usuario_id, local_id, tipo, es_hora_extra, latitud, longitud, dentro_del_radio, foto_data)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [usuarioId, req.usuario.local_id || null, tipo, esHoraExtra, lat, lng, foto]
      )

      return res.status(201).json({
        ok: true,
        message: tipo === 'entrada' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente',
        id: result.insertId,
        tipo,
        esHoraExtra,
        fecha: new Date().toISOString(),
        latitud: lat,
        longitud: lng,
      })
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Error registrando fichaje:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo guardar el fichaje' })
  }
}

async function validarUbicacion(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden validar su ubicación' })
    }

    const lat = Number(req.query.latitud)
    const lng = Number(req.query.longitud)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ ok: false, message: 'La ubicación no es válida' })
    }

    const proyectosAsignados = await obtenerProyectosAsignados(req.usuario.id)
    const proyectoEnRadio = encontrarProyectoEnRadio(proyectosAsignados, lat, lng)
    return res.json({
      ok: true,
      dentroDelRadio: Boolean(proyectoEnRadio),
      proyecto: proyectoEnRadio ? { id: proyectoEnRadio.id, nombre: proyectoEnRadio.name } : null,
      message: proyectoEnRadio
        ? `Estás dentro del radio de ${proyectoEnRadio.name}`
        : proyectosAsignados.length
          ? 'No estás dentro del radio de ningún proyecto asignado'
          : 'No tienes proyectos asignados para registrar asistencia',
    })
  } catch (error) {
    console.error('Error validando ubicación:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo validar la ubicación' })
  }
}

async function obtenerFichajes(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden consultar su asistencia' })
    }

    await registrarInasistenciaSiCorresponde(req.usuario.id)

    const [rows] = await pool.query(
      `SELECT id, tipo, es_hora_extra, fecha_hora, latitud, longitud, dentro_del_radio, foto_data
       FROM fichajes
       WHERE usuario_id = ? AND eliminado = FALSE
       ORDER BY fecha_hora DESC
       LIMIT 30`,
      [req.usuario.id]
    )

    const [ausencias] = await pool.query(
      `SELECT id, tipo, fecha_inicio, fecha_fin, observaciones
       FROM ausencias
       WHERE usuario_id = ?
       ORDER BY fecha_inicio DESC
       LIMIT 30`,
      [req.usuario.id]
    )

    return res.json({ ok: true, fichajes: rows, ausencias })
  } catch (error) {
    console.error('Error consultando fichajes:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el historial de asistencia' })
  }
}

async function obtenerResumenSueldo(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden consultar su sueldo' })
    }

    const [salaryRows] = await pool.query(
      `SELECT monto, tipo, fecha_desde, fecha_hasta
       FROM salarios
       WHERE usuario_id = ?
         AND fecha_desde <= LAST_DAY(CURDATE())
         AND (fecha_hasta IS NULL OR fecha_hasta >= DATE_FORMAT(CURDATE(), '%Y-%m-01'))
       ORDER BY fecha_desde DESC, id DESC
       LIMIT 1`,
      [req.usuario.id]
    )
    const salary = salaryRows[0]
    const [fichajes] = await pool.query(
      `SELECT tipo, fecha_hora
       FROM fichajes
       WHERE usuario_id = ?
         AND eliminado = FALSE
         AND fecha_hora >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND fecha_hora < DATE_ADD(LAST_DAY(CURDATE()), INTERVAL 1 DAY)
       ORDER BY fecha_hora ASC`,
      [req.usuario.id]
    )

    const dailyMinutes = new Map()
    let openEntry = null
    for (const fichaje of fichajes) {
      if (fichaje.tipo === 'entrada') {
        openEntry = fichaje
      } else if (fichaje.tipo === 'salida' && openEntry) {
        const minutes = Math.max(0, (new Date(fichaje.fecha_hora) - new Date(openEntry.fecha_hora)) / 60000)
        const day = new Date(openEntry.fecha_hora).toISOString().slice(0, 10)
        dailyMinutes.set(day, (dailyMinutes.get(day) || 0) + minutes)
        openEntry = null
      }
    }

    const horasTrabajadas = [...dailyMinutes.values()].reduce((total, minutes) => total + minutes / 60, 0)
    const diasTrabajados = dailyMinutes.size
    const tarifa = Number(salary?.monto || 0)
    const tipo = salary?.tipo || null
    const ganado = tipo === 'por_hora'
      ? horasTrabajadas * tarifa
      : tipo === 'jornal'
        ? diasTrabajados * tarifa
        : tarifa

    return res.json({
      ok: true,
      sueldo: {
        mes: new Date().toISOString().slice(0, 7),
        tipo,
        tarifa,
        horas_trabajadas: Number(horasTrabajadas.toFixed(2)),
        dias_trabajados: diasTrabajados,
        ganado: Number(ganado.toFixed(2)),
        calculo: tipo === 'por_hora'
          ? 'Horas trabajadas por tarifa horaria'
          : tipo === 'jornal'
            ? 'Días trabajados por tarifa de jornal'
            : 'Importe asignado; no se prorratea por horas',
      },
    })
  } catch (error) {
    console.error('Error calculando sueldo:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo calcular el sueldo' })
  }
}

async function obtenerReporteAsistencia(req, res) {
  try {
    if (![1, 2].includes(Number(req.usuario.rol_id))) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para consultar reportes' })
    }

    const { desde, hasta, proyectoId } = req.query
    const conditions = ['f.eliminado = FALSE']
    const values = []

    if (desde && /^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      conditions.push('f.fecha_hora >= ?')
      values.push(`${desde} 00:00:00`)
    }
    if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      conditions.push('f.fecha_hora <= ?')
      values.push(`${hasta} 23:59:59`)
    }
    if (!desde && !hasta) {
      conditions.push('f.fecha_hora >= CURDATE() AND f.fecha_hora < DATE_ADD(CURDATE(), INTERVAL 1 DAY)')
    }

    const [rows] = await pool.query(
      `SELECT f.id, f.usuario_id, f.tipo, f.fecha_hora, f.latitud, f.longitud, f.foto_data,
              u.nombre AS empleado, u.email
       FROM fichajes f
       INNER JOIN usuarios u ON u.id = f.usuario_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY f.fecha_hora DESC
       LIMIT 1000`,
      values
    )
    const [projects] = await pool.query('SELECT id, name, assigned_employees FROM projects ORDER BY name ASC')

    const projectAssignments = projects.map((project) => {
      let employees = []
      try {
        employees = project.assigned_employees ? JSON.parse(project.assigned_employees) : []
      } catch {
        employees = []
      }
      return { id: project.id, name: project.name, employees }
    })

    const records = rows
      .map((row) => {
        const project = projectAssignments.find(({ employees }) => employees.includes(row.empleado))
        return {
          ...row,
          proyecto_id: project?.id || null,
          proyecto: project?.name || 'Sin proyecto asignado',
        }
      })
      .filter((row) => !proyectoId || String(row.proyecto_id) === String(proyectoId))

    return res.json({ ok: true, registros: records })
  } catch (error) {
    console.error('Error consultando reporte de asistencia:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo cargar el reporte de asistencia' })
  }
}

async function obtenerProyectosEmpleado(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden consultar sus proyectos' })
    }

    const proyectos = await obtenerProyectosAsignados(req.usuario.id)
    return res.json({
      ok: true,
      proyectos: proyectos.map(({ id, name, jornada, lat, lng, radius_m }) => ({
        id,
        name,
        jornada,
        lat,
        lng,
        radius_m,
      })),
    })
  } catch (error) {
    console.error('Error consultando proyectos del empleado:', error)
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar tus proyectos' })
  }
}

module.exports = { autenticar, registrarFichaje, obtenerFichajes, obtenerResumenSueldo, obtenerReporteAsistencia, obtenerProyectosEmpleado, registrarSalidasAutomaticas, validarUbicacion }
