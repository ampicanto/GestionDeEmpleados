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
    subject: 'Bienvenido a Gestión de Empleados',
    text: `Hola ${nombre},\n\nTu cuenta de empleado ya está activa en Gestión de Empleados.\n\nDatos de acceso:\nDNI: ${dni}\nPIN: el que registraste durante el alta\n\nCon estos datos podrás ingresar al sistema y consultar la información de tu jornada. Si no reconoces esta cuenta, comunícate con el administrador de tu empresa.\n\nSaludos,\nEl equipo de Gestión de Empleados`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263b42"><h2 style="color:#16313b">Bienvenido a Gestión de Empleados</h2><p>Hola ${nombre},</p><p>Tu cuenta de empleado ya está activa.</p><p><strong>Datos de acceso</strong></p><p><strong>DNI:</strong> ${dni}<br><strong>PIN:</strong> el que registraste durante el alta</p><p>Con estos datos podrás ingresar al sistema y consultar la información de tu jornada.</p><p style="color:#63757a;font-size:13px">Si no reconoces esta cuenta, comunícate con el administrador de tu empresa.</p><p>Saludos,<br>El equipo de Gestión de Empleados</p></div>`,
  })

  return true
}

async function enviarCorreoRecuperacion({ email, nombre, enlace, tipo }) {
  const transporter = obtenerTransporter()

  if (!transporter) {
    throw new Error('Falta configurar SMTP en backend/.env')
  }

  const esPin = tipo === 'pin'
  const credencial = esPin ? 'PIN' : 'contraseña'
  const accion = esPin ? 'crear un PIN nuevo de 4 números' : 'crear una contraseña nueva'
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Solicitud para cambiar tu ${credencial.toLowerCase()}`,
    text: `Hola ${nombre},\n\nRecibimos una solicitud para cambiar tu ${credencial.toLowerCase()} de Gestión de Empleados.\n\nPara ${accion}, abre este enlace:\n${enlace}\n\nPor seguridad, el enlace caduca en una hora y solo puede utilizarse una vez. Si no solicitaste este cambio, puedes ignorar este mensaje; tu ${credencial.toLowerCase()} actual no se modificará.\n\nSaludos,\nEl equipo de Gestión de Empleados`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#263b42"><h2 style="color:#16313b">Solicitud para cambiar tu ${credencial.toLowerCase()}</h2><p>Hola ${nombre},</p><p>Recibimos una solicitud para cambiar tu ${credencial.toLowerCase()} de Gestión de Empleados.</p><p>Para ${accion}, haz clic en el siguiente botón:</p><p><a href="${enlace}" style="display:inline-block;padding:12px 18px;background:#4cae83;color:#fff;text-decoration:none;border-radius:6px">Cambiar ${credencial.toLowerCase()}</a></p><p style="color:#63757a;font-size:13px">Por seguridad, el enlace caduca en una hora y solo puede utilizarse una vez. Si no solicitaste este cambio, puedes ignorar este mensaje; tu ${credencial.toLowerCase()} actual no se modificará.</p><p>Saludos,<br>El equipo de Gestión de Empleados</p></div>`,
  })
}

module.exports = { enviarBienvenidaEmpleado, enviarCorreoRecuperacion }