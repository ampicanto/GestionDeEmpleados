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
    await connection.query('ALTER TABLE usuarios ADD COLUMN foto_dni_data MEDIUMTEXT NULL AFTER pin_hash')
    await connection.query('ALTER TABLE usuarios ADD COLUMN foto_perfil_data MEDIUMTEXT NULL AFTER foto_dni_data')
    console.log('Fotos de DNI y perfil añadidas al registro de empleados')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})