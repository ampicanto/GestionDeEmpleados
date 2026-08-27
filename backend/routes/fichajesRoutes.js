const express = require('express')
const { autenticar, registrarFichaje } = require('../controllers/fichajesController')

const router = express.Router()

router.post('/', autenticar, registrarFichaje)

module.exports = router
