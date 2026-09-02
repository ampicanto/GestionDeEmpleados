require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { testConnection } = require('./config/db')

// Routers
const usuariosRoutes = require("./routes/usuariosRoutes")
const fichajesRoutes = require('./routes/fichajesRoutes')
const projectsRouter = require('./controllers/projects')
const exportacionesRoutes = require('./routes/exportacionesRoutes');


const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rutas API
app.use("/api/usuarios", usuariosRoutes)
app.use("/api/fichajes", fichajesRoutes)
app.use("/api/projects", projectsRouter)
app.use('/api/exportaciones', exportacionesRoutes);
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