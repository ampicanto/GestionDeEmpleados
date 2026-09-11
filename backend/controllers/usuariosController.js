const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const usuariosModel = require("../models/usuariosModel");
const { enviarBienvenidaEmpleado, enviarCorreoRecuperacion } = require("../services/emailService");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function obtenerUrlFrontend() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
}

async function solicitarRecuperacion(req, res) {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const respuesta = {
    ok: true,
    message: "Si existe una cuenta activa con ese correo, recibirás un enlace de recuperación."
  };

  if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(200).json(respuesta);
  }

  try {
    const usuario = await usuariosModel.obtenerUsuarioParaRecuperacion(email);
    if (!usuario) return res.status(200).json(respuesta);

    const tipo = usuario.rol_id === 3 ? "pin" : "password";
    const token = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + 60 * 60 * 1000);
    await usuariosModel.guardarTokenRecuperacion({
      usuarioId: usuario.id,
      tokenHash: hashToken(token),
      tipo,
      expiraEn
    });
    await enviarCorreoRecuperacion({
      email: usuario.email,
      nombre: usuario.nombre,
      tipo,
      enlace: `${obtenerUrlFrontend()}/recuperacion?token=${token}`
    });
  } catch (error) {
    console.error("No se pudo solicitar la recuperación:", error.message);
  }

  return res.status(200).json(respuesta);
}

async function validarTokenRecuperacion(req, res) {
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ ok: false, message: "El enlace de recuperación no es válido" });
  }

  try {
    const datosToken = await usuariosModel.obtenerTokenRecuperacion(hashToken(token));
    if (!datosToken) {
      return res.status(400).json({ ok: false, message: "El enlace ya caducó o fue utilizado" });
    }

    return res.status(200).json({ ok: true, tipo: datosToken.tipo });
  } catch (error) {
    console.error("No se pudo validar el enlace de recuperación:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo validar el enlace" });
  }
}

async function restablecerCredencial(req, res) {
  const token = typeof req.body.token === "string" ? req.body.token : "";
  const nuevaCredencial = typeof req.body.nuevaCredencial === "string" ? req.body.nuevaCredencial.trim() : "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ ok: false, message: "El enlace de recuperación no es válido" });
  }

  try {
    const datosToken = await usuariosModel.obtenerTokenRecuperacion(hashToken(token));
    const credencialValida = datosToken?.tipo === "pin"
      ? /^\d{4}$/.test(nuevaCredencial)
      : nuevaCredencial.length >= 8 && nuevaCredencial.length <= 128;

    if (!datosToken || !credencialValida) {
      return res.status(400).json({
        ok: false,
        message: datosToken?.tipo === "pin" ? "El PIN debe tener exactamente 4 números" : "La contraseña debe tener entre 8 y 128 caracteres"
      });
    }

    const resultado = await usuariosModel.actualizarCredencialConToken({
      tokenId: datosToken.id,
      usuarioId: datosToken.usuario_id,
      tipo: datosToken.tipo,
      hash: await bcrypt.hash(nuevaCredencial, 10)
    });

    if (!resultado.affectedRows) {
      return res.status(400).json({ ok: false, message: "El enlace ya caducó o fue utilizado" });
    }

    return res.status(200).json({ ok: true, message: datosToken.tipo === "pin" ? "PIN actualizado correctamente" : "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("No se pudo restablecer la credencial:", error.message);
    return res.status(500).json({ ok: false, message: "No se pudo restablecer la credencial" });
  }
}

// Iniciar sesión (para admin y empleados)
async function iniciarSesion(req, res) {
  try {
    const { email, password, dni, pin } = req.body;

    const usaEmail = typeof email === "string" && typeof password === "string" && !dni && !pin;
    const usaDni = typeof dni === "string" && typeof pin === "string" && !email && !password;

    if (!usaEmail && !usaDni) {
      return res.status(400).json({
        ok: false,
        message: "Ingresa email y contraseña, o DNI y PIN"
      });
    }

    const credencial = (usaEmail ? email : dni).trim().toLowerCase();
    const valor = (usaEmail ? password : pin).trim();
    const credencialValidaPorFormato = usaEmail
      ? credencial.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credencial) && valor.length >= 8 && valor.length <= 128
      : /^\d{4,20}$/.test(credencial) && /^\d+$/.test(valor);

    if (!credencialValidaPorFormato) {
      return res.status(401).json({ ok: false, message: "Credenciales inválidas" });
    }

<<<<<<< HEAD
    const hash = email ? usuario.password_hash : usuario.pin_hash;
    const valor = email ? password : pin;
    const credencialValida = hash && (await bcrypt.compare(valor, hash));
=======
    const usuario = await usuariosModel.obtenerUsuarioPorCredencial(credencial);

    const hash = usuario && usuario.activo
      ? (usaEmail ? usuario.password_hash : usuario.pin_hash)
      : "$2b$10$7EqJtq98hPqEX7fNZaFWoOeN8sD9uF8k5T6q3Z7x3M3dHqW5Yh1eK";
    const credencialValida = await bcrypt.compare(valor, hash);
>>>>>>> origin/rama-nueva

    if (!credencialValida) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales inválidas"
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ ok: false, message: "La autenticación no está configurada" });
    }

    const token = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id, local_id: usuario.local_id },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      ok: true,
      message: "Inicio de sesión correcto",
      token,
      data: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol_id: usuario.rol_id,
        rol: usuario.rol,
        local_id: usuario.local_id
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error al iniciar sesión"
    });
  }
}

// Registrar nuevo administrador
async function registrarAdministrador(req, res) {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Nombre, email y contraseña son obligatorios"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        ok: false,
        message: "La contraseña debe tener al menos 8 caracteres"
      });
    }

    const resultado = await usuariosModel.crearUsuario({
      rol_id: 2,
      puesto_id: null,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password_hash: await bcrypt.hash(password, 10),
      dni: null,
      pin_hash: null,
      local_id: null,
      activo: true
    });

    return res.status(201).json({
      ok: true,
      message: "Cuenta creada correctamente",
      id: resultado.insertId
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        ok: false,
        message: "El email ya está registrado"
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al crear la cuenta"
    });
  }
}

async function registrarEmpleado(req, res) {
  try {
<<<<<<< HEAD
    const { nombre, email, dni, pin, foto_perfil, foto_dni } = req.body;
=======
    const { nombre, email, dni, pin } = req.body;
    const fotoDni = req.files?.fotoDni?.[0];
    const fotoPerfil = req.files?.fotoPerfil?.[0];
>>>>>>> origin/rama-nueva

    const esImagenValida = (archivo) => {
      const { buffer } = archivo;
      const comienzaCon = (firma, offset = 0) => firma.every((byte, indice) => buffer[offset + indice] === byte);
      return comienzaCon([0xff, 0xd8, 0xff])
        || comienzaCon([0x89, 0x50, 0x4e, 0x47])
        || (comienzaCon([0x52, 0x49, 0x46, 0x46]) && comienzaCon([0x57, 0x45, 0x42, 0x50], 8));
    };

    if (!nombre || !email || !dni || !pin || !fotoDni || !fotoPerfil) {
      return res.status(400).json({
        ok: false,
        message: "Nombre, email, DNI, PIN y ambas fotos son obligatorios"
      });
    }

    if (!esImagenValida(fotoDni) || !esImagenValida(fotoPerfil)) {
      return res.status(400).json({ ok: false, message: "Las fotos deben ser imágenes JPEG, PNG o WebP válidas" });
    }

    if (typeof dni !== "string" || !/^\d{4,20}$/.test(dni.trim())) {
      return res.status(400).json({
        ok: false,
        message: "El DNI debe contener entre 4 y 20 números"
      });
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({
        ok: false,
        message: "El PIN debe tener exactamente 4 números"
      });
    }

    const nombreNormalizado = nombre.trim();
    const emailNormalizado = email.trim().toLowerCase();
    const dniNormalizado = dni.trim();

    const resultado = await usuariosModel.crearUsuario({
      rol_id: 3,
      puesto_id: null,
      nombre: nombreNormalizado,
      email: emailNormalizado,
      password_hash: null,
      dni: dniNormalizado,
      pin_hash: await bcrypt.hash(pin, 10),
<<<<<<< HEAD
      foto_perfil: foto_perfil || null,
      foto_dni: foto_dni || null,
=======
      foto_dni_data: `data:${fotoDni.mimetype};base64,${fotoDni.buffer.toString("base64")}`,
      foto_perfil_data: `data:${fotoPerfil.mimetype};base64,${fotoPerfil.buffer.toString("base64")}`,
>>>>>>> origin/rama-nueva
      local_id: null,
      activo: true
    });

    let correoEnviado = false;
    try {
      correoEnviado = await enviarBienvenidaEmpleado({
        email: emailNormalizado,
        nombre: nombreNormalizado,
        dni: dniNormalizado
      });
    } catch (emailError) {
      console.error("No se pudo enviar el correo de bienvenida:", emailError.message);
    }

    return res.status(201).json({
      ok: true,
      message: correoEnviado
        ? "Empleado registrado y correo enviado"
        : "Empleado registrado correctamente",
      id: resultado.insertId,
      correoEnviado
    });
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        ok: false,
        message: "El email o DNI ya está registrado"
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Error al registrar el empleado"
    });
  }
}

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

// Listar únicamente empleados activos
async function listarEmpleados(req, res) {
  try {
    const usuarios = await usuariosModel.obtenerUsuarios();
    const empleados = usuarios.filter((usuario) => Number(usuario.rol_id) === 3 && usuario.activo);

    res.status(200).json({
      ok: true,
      data: empleados,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: "Error al obtener los empleados",
    });
  }
}

async function listarPuestos(req, res) {
  try {
    const puestos = await usuariosModel.obtenerPuestos();

    return res.status(200).json({
      ok: true,
      data: puestos,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener los puestos",
    });
  }
}

async function obtenerPerfil(req, res) {
  try {
    if (Number(req.usuario.rol_id) !== 3) {
      return res.status(403).json({ ok: false, message: "Solo los empleados pueden consultar su perfil" })
    }

    const usuario = await usuariosModel.obtenerPerfilUsuario(req.usuario.id)
    if (!usuario) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" })
    }

    return res.json({ ok: true, data: usuario })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, message: "No se pudo cargar el perfil" })
  }
}

async function asignarPuesto(req, res) {
  try {
    const { id } = req.params;
    const { puesto_id, monto } = req.body;
    const puestoId = Number(puesto_id);
    const montoNumerico = Number(monto);

    if (!Number.isInteger(puestoId) || puestoId <= 0) {
      return res.status(400).json({ ok: false, message: "Selecciona un puesto válido" });
    }
    if (!Number.isFinite(montoNumerico) || montoNumerico <= 0) {
      return res.status(400).json({ ok: false, message: "Ingresa una liquidación mayor que cero" });
    }

    const puestos = await usuariosModel.obtenerPuestos();
    const puesto = puestos.find((item) => Number(item.id) === puestoId);
    if (!puesto) {
      return res.status(400).json({ ok: false, message: "El puesto no está disponible" });
    }

    const resultado = await usuariosModel.asignarPuestoYSalario(
      id,
      puestoId,
      montoNumerico.toFixed(2),
      puesto.tipo_liquidacion,
      req.usuario.id
    );
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Empleado no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      message: "Puesto y liquidación asignados correctamente",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Error al asignar el puesto" });
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
      rol_id,
      puesto_id,
      nombre,
      email,
      password,
      dni,
      pin,
      local_id
    } = req.body;

    if (!rol_id || !nombre) {
      return res.status(400).json({
        ok: false,
        message: "Rol y nombre son obligatorios"
      });
    }

    const rolesValidos = [1, 2, 3];

    if (!rolesValidos.includes(Number(rol_id))) {
      return res.status(400).json({
        ok: false,
        message: "Rol no válido"
      });
    }

    if (Number(rol_id) === 2 && !local_id) {
      return res.status(400).json({
        ok: false,
        message: "Un administrador debe pertenecer a un local"
      });
    }

    if (Number(rol_id) === 3 && (!local_id || !puesto_id)) {
      return res.status(400).json({
        ok: false,
        message: "Un empleado necesita local y puesto"
      });
    }

    const datos = {
      rol_id: Number(rol_id),
      puesto_id: puesto_id || null,
      nombre,
      email: null,
      password_hash: null,
      dni: null,
      pin_hash: null,
      local_id: local_id || null,
      activo: true
    };

    if (Number(rol_id) === 1 || Number(rol_id) === 2) {
      if (!email || !password) {
        return res.status(400).json({
          ok: false,
          message: "Email y contraseña son obligatorios"
        });
      }

      datos.email = email;
      datos.password_hash = await bcrypt.hash(password, 10);
    }

    if (Number(rol_id) === 3) {
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
      rol_id,
      puesto_id,
      nombre,
      email,
      password,
      dni,
      pin,
      local_id,
      activo
    } = req.body;

    const usuario = await usuariosModel.obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

    const credenciales = await usuariosModel.obtenerCredencialesUsuario(id);

    if (!rol_id || !nombre) {
      return res.status(400).json({
        ok: false,
        message: "Rol y nombre son obligatorios"
      });
    }

    const rolesValidos = [1, 2, 3];

    if (!rolesValidos.includes(Number(rol_id))) {
      return res.status(400).json({
        ok: false,
        message: "Rol no válido"
      });
    }

    if (Number(rol_id) === 2 && !local_id) {
      return res.status(400).json({
        ok: false,
        message: "Un administrador debe pertenecer a un local"
      });
    }

    if (Number(rol_id) === 3 && (!local_id || !puesto_id)) {
      return res.status(400).json({
        ok: false,
        message: "Un empleado necesita local y puesto"
      });
    }

    const datos = {
      rol_id: Number(rol_id),
      puesto_id: puesto_id || null,
      nombre,
      email: null,
      password_hash: credenciales.password_hash,
      dni: null,
      pin_hash: credenciales.pin_hash,
      local_id: local_id || null,
      activo: activo !== undefined ? activo : true
    };

    if (Number(rol_id) === 1 || Number(rol_id) === 2) {
      if (!email) {
        return res.status(400).json({
          ok: false,
          message: "El email es obligatorio"
        });
      }

      datos.email = email;

      if (password) {
        datos.password_hash = await bcrypt.hash(password, 10);
      }

      datos.dni = null;
      datos.pin_hash = null;
    }

    if (Number(rol_id) === 3) {
      if (!dni) {
        return res.status(400).json({
          ok: false,
          message: "El DNI es obligatorio"
        });
      }

      datos.dni = dni;

      if (pin) {
        datos.pin_hash = await bcrypt.hash(pin, 10);
      }

      datos.email = null;
      datos.password_hash = null;
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

    const usuario = await usuariosModel.obtenerUsuarioPorId(id);

    if (!usuario) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado"
      });
    }

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
  iniciarSesion,
  solicitarRecuperacion,
  validarTokenRecuperacion,
  restablecerCredencial,
  registrarAdministrador,
  registrarEmpleado,
  listarUsuarios,
  listarEmpleados,
  listarPuestos,
  obtenerPerfil,
  asignarPuesto,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario
};