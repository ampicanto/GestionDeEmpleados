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
    await connection.query('ALTER TABLE fichajes MODIFY COLUMN local_id INT UNSIGNED NULL')
    await connection.query('ALTER TABLE asistencia MODIFY COLUMN local_id INT UNSIGNED NULL')
    await connection.query('ALTER TABLE fichajes ADD COLUMN foto_data MEDIUMTEXT NULL AFTER foto_url')
    console.log('Soporte de fichajes con selfie y ubicación actualizado')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
