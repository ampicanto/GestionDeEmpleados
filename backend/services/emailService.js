const nodemailer = require('nodemailer')

function obtenerTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

async function enviarBienvenidaEmpleado({ email, nombre, dni }) {
  const transporter = obtenerTransporter()

  if (!transporter) {
    console.warn('Correo no enviado: falta configurar SMTP en backend/.env')
    return false
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Tu cuenta de empleado fue creada',
    text: `Hola ${nombre},\n\nTu cuenta de empleado fue creada correctamente.\nDNI de acceso: ${dni}\n\nUsa tu DNI y el PIN que registraste para ingresar al sistema.`,
    html: `<p>Hola ${nombre},</p><p>Tu cuenta de empleado fue creada correctamente.</p><p><strong>DNI de acceso:</strong> ${dni}</p><p>Usa tu DNI y el PIN que registraste para ingresar al sistema.</p>`,
  })

  return true
}

module.exports = { enviarBienvenidaEmpleado }