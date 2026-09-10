require('dotenv').config()

const mysql = require('mysql2/promise')

async function migrar() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recuperacion_credenciales (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE,
        tipo ENUM('password', 'pin') NOT NULL,
        expira_en DATETIME NOT NULL,
        usado_en DATETIME NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_recuperacion_usuario (usuario_id),
        INDEX idx_recuperacion_expira (expira_en),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `)
    console.log('Tabla de recuperación de credenciales creada')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})