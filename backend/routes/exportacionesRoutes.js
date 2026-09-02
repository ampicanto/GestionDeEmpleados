const express = require('express');
const router = express.Router();
const exportacionesController = require('../controllers/exportacionesController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/empleados', authenticate, requireAdmin, exportacionesController.exportarEmpleadosExcel);
router.get('/asistencias', authenticate, requireAdmin, exportacionesController.exportarAsistenciasExcel);

module.exports = router;