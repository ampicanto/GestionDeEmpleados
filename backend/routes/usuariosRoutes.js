const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { authenticate, requireAdmin } = require("../middleware/auth");

// Autenticación y registro de empleados
router.post("/login", usuariosController.iniciarSesion);
router.post("/registro", usuariosController.registrarEmpleado);
router.get("/empleados", authenticate, requireAdmin, usuariosController.listarEmpleados);

// CRUD de usuarios
router.get("/", usuariosController.listarUsuarios);
router.get("/:id", usuariosController.obtenerUsuario);
router.post("/", usuariosController.crearUsuario);
router.put("/:id", usuariosController.actualizarUsuario);
router.delete("/:id", usuariosController.desactivarUsuario);

module.exports = router;