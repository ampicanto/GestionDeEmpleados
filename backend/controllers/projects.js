const express = require('express')
const router = express.Router()
const { pool } = require('../config/db')
const { authenticate, requireAdmin } = require('../middleware/auth')

router.use(authenticate, requireAdmin)

// Inicializar tabla si no existe
async function ensureTable() {
  const sql = `CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assigned_employees TEXT,
    jornada VARCHAR(255),
    lat DOUBLE,
    lng DOUBLE,
    radius_m INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
  const conn = await pool.getConnection()
  try {
    await conn.query(sql)
  } finally {
    conn.release()
  }
}

router.get('/', async (req, res, next) => {
  try {
    await ensureTable()
    const conn = await pool.getConnection()
    const [rows] = await conn.query('SELECT * FROM projects ORDER BY created_at DESC')
    conn.release()
    // parse assigned_employees JSON
    const parsed = rows.map((r) => ({ ...r, assigned_employees: r.assigned_employees ? JSON.parse(r.assigned_employees) : [] }))
    res.json(parsed)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, assigned_employees = [], jornada = '', lat = null, lng = null, radius_m = 50 } = req.body
    if (!name) return res.status(400).json({ message: 'El nombre es requerido' })

    await ensureTable()
    const conn = await pool.getConnection()
    const sql = 'INSERT INTO projects (name, assigned_employees, jornada, lat, lng, radius_m) VALUES (?, ?, ?, ?, ?, ?)'
    const [result] = await conn.query(sql, [name, JSON.stringify(assigned_employees), jornada, lat, lng, radius_m])
    conn.release()
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    next(err)
  }
})

module.exports = router
