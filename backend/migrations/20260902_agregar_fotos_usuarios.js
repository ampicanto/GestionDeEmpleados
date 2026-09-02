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
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'usuarios'
         AND COLUMN_NAME IN ('foto_perfil', 'foto_dni')`
    )
    const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME))

    if (!existingColumns.has('foto_perfil')) {
      await connection.query('ALTER TABLE usuarios ADD COLUMN foto_perfil LONGTEXT NULL')
    }

    if (!existingColumns.has('foto_dni')) {
      await connection.query('ALTER TABLE usuarios ADD COLUMN foto_dni LONGTEXT NULL')
    }

    console.log('Columnas de fotos agregadas a usuarios')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
