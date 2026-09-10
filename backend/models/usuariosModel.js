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
      (
        SELECT s.monto
        FROM salarios s
        WHERE s.usuario_id = u.id AND s.fecha_hasta IS NULL
        ORDER BY s.fecha_desde DESC, s.id DESC
        LIMIT 1
      ) AS salario_monto,
      (
        SELECT s.tipo
        FROM salarios s
        WHERE s.usuario_id = u.id AND s.fecha_hasta IS NULL
        ORDER BY s.fecha_desde DESC, s.id DESC
        LIMIT 1
      ) AS salario_tipo,
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

async function obtenerPuestos() {
  const [rows] = await pool.query(`
    SELECT id, nombre, descripcion, tipo_liquidacion
    FROM puestos
    WHERE activo = TRUE
    ORDER BY nombre ASC
  `);

  return rows;
}

async function asignarPuestoYSalario(id, puestoId, monto, tipo, creadoPor) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [resultado] = await connection.query(
      `UPDATE usuarios SET puesto_id = ? WHERE id = ? AND rol_id = 3 AND activo = TRUE`,
      [puestoId, id]
    );

    if (resultado.affectedRows === 0) {
      await connection.rollback();
      return resultado;
    }

    await connection.query(
      `UPDATE salarios SET fecha_hasta = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
       WHERE usuario_id = ? AND fecha_hasta IS NULL`,
      [id]
    );
    await connection.query(
      `INSERT INTO salarios (usuario_id, monto, tipo, fecha_desde, motivo, creado_por)
       VALUES (?, ?, ?, CURRENT_DATE, ?, ?)`,
      [id, monto, tipo, 'Asignación de puesto', creadoPor]
    );
    await connection.commit();
    return resultado;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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

async function obtenerPerfilUsuario(id) {
  const [rows] = await pool.query(
    `SELECT id, nombre, dni, foto_perfil_data
     FROM usuarios
     WHERE id = ? AND rol_id = 3 AND activo = TRUE`,
    [id]
  )

  return rows[0]
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

async function obtenerUsuarioParaRecuperacion(email) {
  const [rows] = await pool.query(
    `SELECT id, nombre, email, rol_id, activo
     FROM usuarios
     WHERE email = ? AND activo = TRUE
     LIMIT 1`,
    [email]
  )

  return rows[0]
}

async function guardarTokenRecuperacion({ usuarioId, tokenHash, tipo, expiraEn }) {
  await pool.query(
    `DELETE FROM recuperacion_credenciales
     WHERE usuario_id = ? OR expira_en < NOW() OR usado_en IS NOT NULL`,
    [usuarioId]
  )
  await pool.query(
    `INSERT INTO recuperacion_credenciales (usuario_id, token_hash, tipo, expira_en)
     VALUES (?, ?, ?, ?)`,
    [usuarioId, tokenHash, tipo, expiraEn]
  )
}

async function obtenerTokenRecuperacion(tokenHash) {
  const [rows] = await pool.query(
    `SELECT r.id, r.usuario_id, r.tipo, u.nombre, u.email, u.activo
     FROM recuperacion_credenciales r
     INNER JOIN usuarios u ON u.id = r.usuario_id
     WHERE r.token_hash = ? AND r.usado_en IS NULL AND r.expira_en > NOW() AND u.activo = TRUE
     LIMIT 1`,
    [tokenHash]
  )

  return rows[0]
}

async function actualizarCredencialConToken({ tokenId, usuarioId, tipo, hash }) {
  const campo = tipo === 'pin' ? 'pin_hash' : 'password_hash'
  const [resultado] = await pool.query(
    `UPDATE usuarios u
     INNER JOIN recuperacion_credenciales r ON r.usuario_id = u.id
     SET u.${campo} = ?, r.usado_en = NOW()
     WHERE r.id = ? AND r.usuario_id = ? AND r.tipo = ?
       AND r.usado_en IS NULL AND r.expira_en > NOW() AND u.activo = TRUE`,
    [hash, tokenId, usuarioId, tipo]
  )

  return resultado
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
      foto_dni_data,
      foto_perfil_data,
      local_id,
      activo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      datos.rol_id,
      datos.puesto_id,
      datos.nombre,
      datos.email,
      datos.password_hash,
      datos.dni,
      datos.pin_hash,
      datos.foto_dni_data || null,
      datos.foto_perfil_data || null,
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
  obtenerPuestos,
  asignarPuestoYSalario,
  obtenerUsuarioPorId,
  obtenerPerfilUsuario,
  obtenerCredencialesUsuario,
  obtenerUsuarioParaRecuperacion,
  guardarTokenRecuperacion,
  obtenerTokenRecuperacion,
  actualizarCredencialConToken,
  crearUsuario,
  actualizarUsuario,
  desactivarUsuario
};