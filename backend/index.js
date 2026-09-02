require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { testConnection } = require('./config/db')

// Routers
const usuariosRoutes = require("./routes/usuariosRoutes")
const fichajesRoutes = require('./routes/fichajesRoutes')
const projectsRouter = require('./controllers/projects')

const app = express()
const PORT = process.env.PORT || 3000
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error('No permitido por CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rutas API
app.use("/api/usuarios", usuariosRoutes)
app.use("/api/fichajes", fichajesRoutes)
app.use("/api/projects", projectsRouter)

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