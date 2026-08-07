const usuariosModel = require("../models/usuariosModel");

// Obtener todos los usuarios
async function listarUsuarios(req, res) {
  try {
    const usuarios = await usuariosModel.obtenerUsuarios();

    res.status(200).json({
      ok: true,
      data: usuarios,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al obtener los usuarios",
    });
  }
}

module.exports = {
  listarUsuarios,
};