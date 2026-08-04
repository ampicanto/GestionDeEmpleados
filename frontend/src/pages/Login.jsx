import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'

function Login() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-back">
          <FaArrowLeft />
          <span>Volver</span>
        </Link>

        <div className="auth-brand">
          <span className="auth-brand-mark">IC</span>
          <div>
            <h2>Ingenio Constructora</h2>
            <p>Acceso seguro</p>
          </div>
        </div>

        <h1>Iniciar sesión</h1>
        <p className="auth-description">
          Ingresa tus credenciales para entrar al panel de proyectos y operaciones.
        </p>

        <form className="auth-form">
          <label className="auth-field">
            <span>Correo electrónico</span>
            <div className="auth-input">
              <FaEnvelope />
              <input type="email" placeholder="tu@correo.com" />
            </div>
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <div className="auth-input auth-input-password">
              <FaLock />
              <input type={showPassword ? 'text' : 'password'} placeholder="********" />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <Link to="/recuperacion" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </label>

          <button type="submit" className="btn btn-primary auth-submit">
            Entrar
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
