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
      CREATE TABLE IF NOT EXISTS notificaciones_push (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_notificacion_push_endpoint (endpoint),
        INDEX idx_notificaciones_push_usuario (usuario_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `)
    console.log('Suscripciones de notificaciones push creadas')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})