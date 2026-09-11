const jwt = require('jsonwebtoken')

function authenticate(req, res, next) {
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
  } catch {
    return res.status(401).json({ ok: false, message: 'Sesión expirada' })
  }
}

function requireAdmin(req, res, next) {
  if (![1, 2].includes(Number(req.usuario?.rol_id))) {
    return res.status(403).json({ ok: false, message: 'No tienes permisos para gestionar proyectos' })
  }

  next()
}

module.exports = { authenticate, requireAdmin }