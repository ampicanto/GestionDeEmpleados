const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

function autenticar(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Sesión no válida' })
  }

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion')
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

    const connection = await pool.getConnection()
    try {
      const [lastRows] = await connection.query(
        `SELECT tipo FROM fichajes
         WHERE usuario_id = ? AND DATE(fecha_hora) = CURDATE() AND eliminado = FALSE
         ORDER BY fecha_hora DESC LIMIT 1`,
        [usuarioId]
      )
      const tipo = lastRows[0]?.tipo === 'entrada' ? 'salida' : 'entrada'

      const [result] = await connection.query(
        `INSERT INTO fichajes
          (usuario_id, local_id, tipo, latitud, longitud, dentro_del_radio, foto_data)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)`,
        [usuarioId, req.usuario.local_id || null, tipo, lat, lng, foto]
      )

      return res.status(201).json({
        ok: true,
        message: tipo === 'entrada' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente',
        id: result.insertId,
        tipo,
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

module.exports = { autenticar, registrarFichaje }
