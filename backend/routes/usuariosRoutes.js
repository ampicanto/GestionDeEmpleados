const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { authenticate, requireAdmin } = require("../middleware/auth");

router.post("/login", usuariosController.iniciarSesion);
router.post("/registro", usuariosController.registrarEmpleado);
router.get("/empleados", authenticate, requireAdmin, usuariosController.listarEmpleados);

// Obtener todos los usuarios
router.get("/", usuariosController.listarUsuarios);

// Obtener un usuario por ID
router.get("/:id", usuariosController.obtenerUsuario);

// Crear usuario
router.post("/", usuariosController.crearUsuario);

// Actualizar usuario
router.put("/:id", usuariosController.actualizarUsuario);

// Desactivar usuario
router.delete("/:id", usuariosController.desactivarUsuario);


module.exports = router;