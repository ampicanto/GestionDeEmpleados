const { guardarSuscripcion } = require('../services/pushService')

async function registrarSuscripcion(req, res) {
  try {
    await guardarSuscripcion(req.usuario.id, req.body)
    return res.status(201).json({ ok: true, message: 'Notificaciones activadas' })
  } catch (error) {
    const status = error.statusCode || 500
    console.error('Error registrando suscripción push:', error)
    return res.status(status).json({ ok: false, message: status === 400 ? error.message : 'No se pudo activar las notificaciones' })
  }
}

module.exports = { registrarSuscripcion }