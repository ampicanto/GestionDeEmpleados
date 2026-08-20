const { pool } = require("../config/db");

async function obtenerUsuarioPorCredencial(credencial) {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.nombre,
      u.rol_id,
      r.nombre AS rol,
      u.local_id,
      u.activo,
      u.email,
      u.password_hash,
      u.dni,
      u.pin_hash
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    WHERE u.email = ? OR u.dni = ?
    LIMIT 1
    `,
    [credencial, credencial]
  );

  return rows[0];
}

// Obtener todos los usuarios
async function obtenerUsuarios() {
  const [rows] = await pool.query(`
    SELECT
      u.id,
      u.rol_id,
      r.nombre AS rol,
      u.puesto_id,
      p.nombre AS puesto,
      u.nombre,
      u.email,
      u.dni,
      u.local_id,
      u.activo,
      u.creado_en
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    LEFT JOIN puestos p ON u.puesto_id = p.id
    ORDER BY u.id ASC
  `);

  return rows;
}

// Obtener un usuario por ID
async function obtenerUsuarioPorId(id) {
  const [rows] = await pool.query(
    `
    SELECT
      u.id,
      u.rol_id,
      r.nombre AS rol,
      u.puesto_id,
      p.nombre AS puesto,
      u.nombre,
      u.email,
      u.dni,
      u.local_id,
      u.activo,
      u.creado_en
    FROM usuarios u
    INNER JOIN roles r ON u.rol_id = r.id
    LEFT JOIN puestos p ON u.puesto_id = p.id
    WHERE u.id = ?
    `,
    [id]
  );

  return rows[0];
}

// Obtener datos internos de seguridad de un usuario
// NO se devuelve directamente al cliente
async function obtenerCredencialesUsuario(id) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      password_hash,
      pin_hash
    FROM usuarios
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
}

// Crear un nuevo usuario
async function crearUsuario(datos) {
  const [resultado] = await pool.query(
    `
    INSERT INTO usuarios (
      rol_id,
      puesto_id,
      nombre,
      email,
      password_hash,
      dni,
      pin_hash,
      local_id,
      activo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      datos.rol_id,
      datos.puesto_id,
      datos.nombre,
      datos.email,
      datos.password_hash,
      datos.dni,
      datos.pin_hash,
      datos.local_id,
      datos.activo
    ]
  );

  return resultado;
}

// Actualizar un usuario
async function actualizarUsuario(id, datos) {
  const [resultado] = await pool.query(
    `
    UPDATE usuarios
    SET
      rol_id = ?,
      puesto_id = ?,
      nombre = ?,
      email = ?,
      password_hash = ?,
      dni = ?,
      pin_hash = ?,
      local_id = ?,
      activo = ?
    WHERE id = ?
    `,
    [
      datos.rol_id,
      datos.puesto_id,
      datos.nombre,
      datos.email,
      datos.password_hash,
      datos.dni,
      datos.pin_hash,
      datos.local_id,
      datos.activo,
      id
    ]
  );

  return resultado;
}

// Desactivar un usuario
async function desactivarUsuario(id) {
  const [resultado] = await pool.query(
    `
    UPDATE usuarios
    SET activo = false
    WHERE id = ?
    `,
    [id]
  );

  return resultado;
}

module.exports = {
  obtenerUsuarioPorCredencial,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerCredencialesUsuario,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario
};