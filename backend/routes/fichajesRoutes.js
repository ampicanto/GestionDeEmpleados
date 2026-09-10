const express = require('express')
const { autenticar, registrarFichaje, obtenerFichajes, obtenerResumenSueldo, obtenerReporteAsistencia, validarUbicacion, obtenerProyectosEmpleado } = require('../controllers/fichajesController')
const { requireAdmin } = require('../middleware/auth')

const router = express.Router()

router.post('/', autenticar, registrarFichaje)
router.get('/reportes/asistencia', autenticar, requireAdmin, obtenerReporteAsistencia)
router.get('/sueldo', autenticar, obtenerResumenSueldo)
router.get('/', autenticar, obtenerFichajes)
router.get('/validar-ubicacion', autenticar, validarUbicacion)
router.get('/proyectos', autenticar, obtenerProyectosEmpleado)

module.exports = router
