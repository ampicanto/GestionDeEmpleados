import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser } from 'react-icons/fa'

function Registro() {
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
            <p>Registro de usuario</p>
          </div>
        </div>

        <h1>Crear cuenta</h1>
        <p className="auth-description">
          Completa tus datos para acceder a la plataforma y gestionar tus proyectos.
        </p>

        <form className="auth-form">
          <label className="auth-field">
            <span>Nombre completo</span>
            <div className="auth-input">
              <FaUser />
              <input type="text" placeholder="Tu nombre" />
            </div>
          </label>

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
          </label>

          <button type="submit" className="btn btn-primary auth-submit">
            Registrarme
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Registro
