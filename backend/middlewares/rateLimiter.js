const rateLimit = require('express-rate-limit');

// Límite estricto para el inicio de sesión: máximo 5 intentos cada 15 minutos por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 peticiones
  standardHeaders: true, // Devuelve headers estándar `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers obsoletos `X-RateLimit-*`
  message: {
    ok: false,
    message: 'Demasiados intentos de inicio de sesión fallidos. Por seguridad, tu acceso fue bloqueado temporalmente. Intenta nuevamente en 15 minutos.',
  },
});

// Límite general para creación de cuentas / registro: máximo 10 registros por hora por IP
const registroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    message: 'Demasiadas solicitudes de registro desde esta conexión. Intenta más tarde.',
  },
});

module.exports = {
  loginLimiter,
  registroLimiter,
};