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

module.exports = {
  obtenerUsuarios,
};