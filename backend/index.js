require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { testConnection } = require('./config/db')
const { createRateLimiter } = require('./middleware/rateLimit')
const usuariosRoutes = require("./routes/usuariosRoutes");
const fichajesRoutes = require('./routes/fichajesRoutes')
const ausenciasRoutes = require('./routes/ausenciasRoutes')
const notificacionesRoutes = require('./routes/notificacionesRoutes')
const { registrarSalidasAutomaticas } = require('./controllers/fichajesController')

const app = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('Origen no permitido'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb', strict: true }))
app.use(express.urlencoded({ extended: true }))

const projectsRouter = require('./controllers/projects')
app.use('/api/projects', projectsRouter)
app.use("/api/usuarios", usuariosRoutes);
app.use('/api/fichajes', fichajesRoutes)
app.use('/api/ausencias', ausenciasRoutes)
app.use('/api/notificaciones', notificacionesRoutes)

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
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, message: 'Cada imagen debe pesar como máximo 5 MB' })
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message === 'Tipo de archivo no permitido') {
    return res.status(400).json({ ok: false, message: 'Solo se permiten imágenes JPEG, PNG o WebP' })
  }
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
    const revisarSalidas = () => registrarSalidasAutomaticas().catch((error) => console.error('Error en salidas automáticas:', error))
    revisarSalidas()
    setInterval(revisarSalidas, 60 * 1000)
  })
}

startServer()
