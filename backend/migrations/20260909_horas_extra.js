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
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fichajes'
         AND COLUMN_NAME = 'es_hora_extra'`
    )
    if (!columns.length) {
      await connection.query('ALTER TABLE fichajes ADD COLUMN es_hora_extra BOOLEAN NOT NULL DEFAULT FALSE AFTER tipo')
    }
    console.log('Marcado de horas extra añadido')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})