const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");

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