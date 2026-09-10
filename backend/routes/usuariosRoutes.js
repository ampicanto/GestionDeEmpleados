const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { authenticate, requireAdmin } = require("../middleware/auth");
const multer = require("multer");
const { createRateLimiter } = require("../middleware/rateLimit");

const uploadRegistro = multer({
	storage: multer.memoryStorage(),
	limits: { files: 2, fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
		if (!tiposPermitidos.includes(file.mimetype)) {
			return callback(new Error("Tipo de archivo no permitido"));
		}
		return callback(null, true);
	}
}).fields([
	{ name: "fotoDni", maxCount: 1 },
	{ name: "fotoPerfil", maxCount: 1 }
]);

router.post("/login", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Demasiados intentos. Espera unos minutos" }), usuariosController.iniciarSesion);
router.post("/recuperacion", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: "Demasiadas solicitudes. Espera unos minutos" }), usuariosController.solicitarRecuperacion);
router.get("/recuperacion/validar", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "Demasiadas solicitudes. Espera unos minutos" }), usuariosController.validarTokenRecuperacion);
router.post("/recuperacion/restablecer", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: "Demasiados intentos. Espera unos minutos" }), usuariosController.restablecerCredencial);
router.post("/registro", createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: "Demasiados registros desde esta dirección" }), uploadRegistro, usuariosController.registrarEmpleado);
router.get("/empleados", authenticate, requireAdmin, usuariosController.listarEmpleados);
router.get("/puestos", authenticate, requireAdmin, usuariosController.listarPuestos);
router.get("/perfil", authenticate, usuariosController.obtenerPerfil);
router.patch("/:id/puesto", authenticate, requireAdmin, usuariosController.asignarPuesto);

// Obtener todos los usuarios
router.get("/", authenticate, requireAdmin, usuariosController.listarUsuarios);

// Obtener un usuario por ID
router.get("/:id", authenticate, requireAdmin, usuariosController.obtenerUsuario);

// Crear usuario
router.post("/", authenticate, requireAdmin, usuariosController.crearUsuario);

// Actualizar usuario
router.put("/:id", authenticate, requireAdmin, usuariosController.actualizarUsuario);

// Desactivar usuario
router.delete("/:id", authenticate, requireAdmin, usuariosController.desactivarUsuario);


module.exports = router;