const express = require('express')
const { autenticar } = require('../controllers/fichajesController')
const { requireAdmin } = require('../middleware/auth')
const { solicitarJustificacion, obtenerAusencias, revisarAusencia, marcarNotificacionLeida } = require('../controllers/ausenciasController')

const router = express.Router()

router.post('/', autenticar, solicitarJustificacion)
router.get('/', autenticar, requireAdmin, obtenerAusencias)
router.patch('/:id/leida', autenticar, requireAdmin, marcarNotificacionLeida)
router.patch('/:id/revision', autenticar, requireAdmin, revisarAusencia)

module.exports = router
