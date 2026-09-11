const { pool } = require('../config/db')
const { notificarNuevaJustificacion } = require('../services/pushService')

function esFechaValida(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00`))
}

async function solicitarJustificacion(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: 'Solo los empleados pueden solicitar una justificación' })
    }

    const { fechaInicio, fechaFin, observaciones } = req.body
    if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
      return res.status(400).json({ ok: false, message: 'Indica fechas válidas para la ausencia' })
    }
    if (fechaFin < fechaInicio) {
      return res.status(400).json({ ok: false, message: 'La fecha final no puede ser anterior a la inicial' })
    }
    if (!observaciones || observaciones.trim().length < 5) {
      return res.status(400).json({ ok: false, message: 'Describe brevemente el motivo de la ausencia' })
    }

    const [result] = await pool.query(
      `INSERT INTO ausencias (usuario_id, tipo, fecha_inicio, fecha_fin, observaciones)
       VALUES (?, 'falta_justificada', ?, ?, ?)`,
      [req.usuario.id, fechaInicio, fechaFin, observaciones.trim()]
    )

    const [usuarios] = await pool.query('SELECT nombre FROM usuarios WHERE id = ?', [req.usuario.id])
    notificarNuevaJustificacion({
      empleado: usuarios[0]?.nombre || 'Un empleado',
      fechaInicio,
      fechaFin,
    }).catch((error) => console.error('Error enviando notificación de justificación:', error))

    return res.status(201).json({
      ok: true,
      message: 'Solicitud de justificación enviada correctamente',
      id: result.insertId,
    })
  } catch (error) {
    console.error('Error solicitando justificación:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo enviar la solicitud' })
  }
}

async function obtenerAusencias(req, res) {
  try {
    if (![1, 2].includes(Number(req.usuario.rol_id))) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para consultar ausencias' })
    }

    const { desde, hasta, proyectoId } = req.query
    const conditions = ['1 = 1']
    const values = []

    if (desde && esFechaValida(desde)) {
      conditions.push('a.fecha_fin >= ?')
      values.push(desde)
    }
    if (hasta && esFechaValida(hasta)) {
      conditions.push('a.fecha_inicio <= ?')
      values.push(hasta)
    }

    const [rows] = await pool.query(
            `SELECT a.id, a.usuario_id, a.tipo, a.fecha_inicio, a.fecha_fin, a.observaciones,
              a.notificacion_leida, a.estado, a.revisado_por, a.revisado_en, a.creado_en, u.nombre AS empleado, u.email
       FROM ausencias a
       INNER JOIN usuarios u ON u.id = a.usuario_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.fecha_inicio DESC, u.nombre ASC`,
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

    const absences = rows.map((row) => {
      const project = projectAssignments.find(({ employees }) => employees.includes(row.empleado))
      return {
        ...row,
        proyecto_id: project?.id || null,
        proyecto: project?.name || 'Sin proyecto asignado',
      }
    }).filter((row) => !proyectoId || String(row.proyecto_id) === String(proyectoId))

    return res.json({ ok: true, ausencias: absences })
  } catch (error) {
    console.error('Error consultando ausencias:', error)
    return res.status(500).json({ ok: false, message: 'No se pudieron cargar las ausencias' })
  }
}

async function marcarNotificacionLeida(req, res) {
  try {
    if (![1, 2].includes(Number(req.usuario.rol_id))) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para marcar notificaciones' })
    }

    const [result] = await pool.query(
      'UPDATE ausencias SET notificacion_leida = TRUE WHERE id = ?',
      [req.params.id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' })
    }

    return res.json({ ok: true })
  } catch (error) {
    console.error('Error marcando notificación como leída:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo marcar la notificación como leída' })
  }
}

async function revisarAusencia(req, res) {
  try {
    if (![1, 2].includes(Number(req.usuario.rol_id))) {
      return res.status(403).json({ ok: false, message: 'No tienes permisos para revisar ausencias' })
    }

    const estado = String(req.body?.estado || '').toLowerCase()
    if (!['aceptada', 'rechazada'].includes(estado)) {
      return res.status(400).json({ ok: false, message: 'La decisión debe ser aceptada o rechazada' })
    }

    const [result] = await pool.query(
      `UPDATE ausencias
       SET estado = ?, revisado_por = ?, revisado_en = CURRENT_TIMESTAMP
       WHERE id = ? AND estado = 'pendiente'`,
      [estado, req.usuario.id, req.params.id]
    )

    if (result.affectedRows === 0) {
      const [rows] = await pool.query('SELECT id, estado FROM ausencias WHERE id = ?', [req.params.id])
      if (!rows[0]) return res.status(404).json({ ok: false, message: 'Solicitud no encontrada' })
      return res.status(409).json({ ok: false, message: 'Esta solicitud ya fue revisada' })
    }

    return res.json({ ok: true, message: estado === 'aceptada' ? 'Justificación aceptada' : 'Justificación rechazada' })
  } catch (error) {
    console.error('Error revisando ausencia:', error)
    return res.status(500).json({ ok: false, message: 'No se pudo actualizar la solicitud' })
  }
}

module.exports = { solicitarJustificacion, obtenerAusencias, revisarAusencia, marcarNotificacionLeida }
