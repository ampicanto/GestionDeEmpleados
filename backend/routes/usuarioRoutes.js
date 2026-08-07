const express = require("express");
const router = express.Router();

const usuariosController = require("../controllers/usuariosController");

// Obtener todos los usuarios
router.get("/", usuariosController.listarUsuarios);

module.exports = router;