require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { testConnection } = require('./config/db')
const usuariosRoutes = require("./routes/usuariosRoutes");

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/api/usuarios", usuariosRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'API de Ingenio Constructora',
    status: 'online',
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Backend funcionando',
    timestamp: new Date().toISOString(),
  })
})

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Error interno del servidor' })
})

async function startServer() {
  try {
    await testConnection()
    console.log('Conexión a la base de datos lista')
  } catch (error) {
    console.warn('La base de datos no está disponible:', error.message)
  }

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
  })
}

startServer()
