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
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ausencias'
         AND COLUMN_NAME IN ('estado', 'revisado_por', 'revisado_en', 'notificacion_leida')`
    )
    const existingColumns = new Set(columns.map(({ COLUMN_NAME }) => COLUMN_NAME))

    if (!existingColumns.has('estado')) {
      await connection.query("ALTER TABLE ausencias ADD COLUMN estado ENUM('pendiente', 'aceptada', 'rechazada') NOT NULL DEFAULT 'pendiente' AFTER observaciones")
    }
    if (!existingColumns.has('revisado_por')) {
      await connection.query('ALTER TABLE ausencias ADD COLUMN revisado_por INT UNSIGNED NULL AFTER estado')
    }
    if (!existingColumns.has('revisado_en')) {
      await connection.query('ALTER TABLE ausencias ADD COLUMN revisado_en DATETIME NULL AFTER revisado_por')
    }
    if (!existingColumns.has('notificacion_leida')) {
      await connection.query('ALTER TABLE ausencias ADD COLUMN notificacion_leida BOOLEAN NOT NULL DEFAULT FALSE AFTER observaciones')
    }

    const [constraints] = await connection.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'ausencias'
         AND CONSTRAINT_NAME = 'fk_ausencia_revisor'`
    )
    if (!constraints.length) {
      await connection.query('ALTER TABLE ausencias ADD CONSTRAINT fk_ausencia_revisor FOREIGN KEY (revisado_por) REFERENCES usuarios(id)')
    }
    console.log('Estados de revisión de ausencias añadidos')
  } finally {
    await connection.end()
  }
}

migrar().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})