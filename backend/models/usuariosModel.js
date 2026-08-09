const { pool } = require("../config/db");

// Obtener todos los usuarios
async function obtenerUsuarios() {
  const [rows] = await pool.query(`
    SELECT
      id,
      rol,
      nombre,
      email,
      dni,
      local_id,
      activo,
      creado_en
    FROM usuarios
    ORDER BY id ASC
  `);

  return rows;
}

// Obtener un usuario por ID
async function obtenerUsuarioPorId(id) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      rol,
      nombre,
      email,
      dni,
      local_id,
      activo,
      creado_en
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
      rol,
      nombre,
      email,
      password_hash,
      dni,
      pin_hash,
      local_id,
      activo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      datos.rol,
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

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
};