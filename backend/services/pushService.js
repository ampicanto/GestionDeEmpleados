const webpush = require('web-push')
const { pool } = require('../config/db')

function pushConfigurado() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
}

if (pushConfigurado()) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
}

async function guardarSuscripcion(usuarioId, subscription) {
  const { endpoint, keys } = subscription || {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    const error = new Error('La suscripción push no tiene un formato válido')
    error.statusCode = 400
    throw error
  }

  await pool.query(
    `INSERT INTO notificaciones_push (usuario_id, endpoint, p256dh, auth)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [usuarioId, endpoint, keys.p256dh, keys.auth]
  )
}

async function notificarNuevaJustificacion({ empleado, fechaInicio, fechaFin }) {
  if (!pushConfigurado()) return

  const [subscriptions] = await pool.query('SELECT id, endpoint, p256dh, auth FROM notificaciones_push')
  const periodo = fechaInicio === fechaFin ? fechaInicio : `${fechaInicio} al ${fechaFin}`
  const payload = JSON.stringify({
    title: 'Nueva solicitud de justificación',
    body: `${empleado} solicita justificar su inasistencia (${periodo})`,
    url: '/admin',
  })

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload)
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await pool.query('DELETE FROM notificaciones_push WHERE id = ?', [subscription.id])
      } else {
        console.error('No se pudo enviar una notificación push:', error.message)
      }
    }
  }))
}

module.exports = { guardarSuscripcion, notificarNuevaJustificacion }