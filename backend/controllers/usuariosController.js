const bcrypt = require("bcryptjs");
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

// Obtener un usuario por ID
async function obtenerUsuario(req, res) {
  try {
    const { id } = req.params;

    const usuario = await usuariosModel.obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    res.status(200).json({
      ok: true,
      data: usuario,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al obtener el usuario",
    });
  }
}

// Crear un nuevo usuario
async function crearUsuario(req, res) {
  try {
    const {
      rol,
      nombre,
      email,
      password,
      dni,
      pin,
      local_id
    } = req.body;

    // Validaciones básicas
    if (!rol || !nombre) {
      return res.status(400).json({
        ok: false,
        message: "Rol y nombre son obligatorios"
      });
    }
    const rolesValidos = ["super_admin", "admin", "empleado"];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        ok: false,
        message: "Rol no válido"
      });
    }

    const datos = {
      rol,
      nombre,
      email: null,
      password_hash: null,
      dni: null,
      pin_hash: null,
      local_id: local_id || null,
      activo: true
    };

    // Administrador o Super Admin
    if (rol === "admin" || rol === "super_admin") {

      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          message: "Email y contraseña son obligatorios"
        });
      }

      datos.email = email;
      datos.password_hash = await bcrypt.hash(password, 10);

    }

    // Empleado
    if (rol === "empleado") {

      if (!dni || !pin) {
        return res.status(400).json({
          ok: false,
          message: "DNI y PIN son obligatorios"
        });
      }

      datos.dni = dni;
      datos.pin_hash = await bcrypt.hash(pin, 10);

    }

    const resultado = await usuariosModel.crearUsuario(datos);

    res.status(201).json({
      ok: true,
      message: "Usuario creado correctamente",
      id: resultado.insertId
    });

  } catch (error) {

    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        ok: false,
        message: "El email o DNI ya está registrado"
      });
    }

    res.status(500).json({
      ok: false,
      message: "Error al crear el usuario"
    });

  }
}

// Actualizar un usuario
async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;

    const {
      rol,
      nombre,
      email,
      password,
      dni,
      pin,
      local_id,
      activo
    } = req.body;

    // Verificar que el usuario exista
    const usuario = await usuariosModel.obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    // Validaciones básicas
    if (!rol || !nombre) {
      return res.status(400).json({
        ok: false,
        message: "Rol y nombre son obligatorios"
      });
    }

    const rolesValidos = ["super_admin", "admin", "empleado"];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        ok: false,
        message: "Rol no válido"
      });
    }

    const datos = {
      rol,
      nombre,
      email: null,
      password_hash: null,
      dni: null,
      pin_hash: null,
      local_id: local_id || null,
      activo: activo !== undefined ? activo : true
    };

    // Administrador o Super Admin
    if (rol === "admin" || rol === "super_admin") {

      if (!email) {
        return res.status(400).json({
          ok: false,
          message: "El email es obligatorio"
        });
      }

      datos.email = email;

      if (password) {
        datos.password_hash = await bcrypt.hash(password, 10);
      } else {
        datos.password_hash = usuario.password_hash;
      }
    }

    // Empleado
    if (rol === "empleado") {

      if (!dni) {
        return res.status(400).json({
          ok: false,
          message: "El DNI es obligatorio"
        });
      }

      datos.dni = dni;

      if (pin) {
        datos.pin_hash = await bcrypt.hash(pin, 10);
      } else {
        datos.pin_hash = usuario.pin_hash;
      }
    }

    const resultado = await usuariosModel.actualizarUsuario(id, datos);

    res.status(200).json({
      ok: true,
      message: "Usuario actualizado correctamente",
      affectedRows: resultado.affectedRows
    });

  } catch (error) {

    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        ok: false,
        message: "El email o DNI ya está registrado"
      });
    }

    res.status(500).json({
      ok: false,
      message: "Error al actualizar el usuario"
    });
  }
}

// Desactivar un usuario
async function desactivarUsuario(req, res) {
  try {
    const { id } = req.params;

    // Verificar que el usuario exista
    const usuario = await usuariosModel.obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    // Verificar si ya está desactivado
    if (!usuario.activo) {
      return res.status(400).json({
        ok: false,
        message: "El usuario ya está desactivado"
      });
    }

    const resultado = await usuariosModel.desactivarUsuario(id);

    res.status(200).json({
      ok: true,
      message: "Usuario desactivado correctamente",
      affectedRows: resultado.affectedRows
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      ok: false,
      message: "Error al desactivar el usuario"
    });
  }
}




module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario,

};