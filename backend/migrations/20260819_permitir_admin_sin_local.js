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
    await connection.query('ALTER TABLE usuarios DROP CHECK chk_usuario_alcance')
    await connection.query(
      `ALTER TABLE usuarios
       ADD CONSTRAINT chk_usuario_alcance CHECK (
         (rol_id = 1 AND local_id IS NULL AND puesto_id IS NULL)
         OR (rol_id = 2 AND puesto_id IS NULL)
         OR (rol_id = 3)
       )`
    )
    console.log('Restricción chk_usuario_alcance actualizada')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})