const express = require('express')
const { authenticate, requireAdmin } = require('../middleware/auth')
const { registrarSuscripcion } = require('../controllers/notificacionesController')

const router = express.Router()

router.post('/suscripcion', authenticate, requireAdmin, registrarSuscripcion)

module.exports = router