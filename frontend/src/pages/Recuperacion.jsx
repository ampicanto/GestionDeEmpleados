import { Link } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa'

function Recuperacion() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-back">
          <FaArrowLeft />
          <span>Volver</span>
        </Link>

        <div className="auth-brand">
          <span className="auth-brand-mark">IC</span>
          <div>
            <h2>Ingenio Constructora</h2>
            <p>Recuperar contraseña</p>
          </div>
        </div>

        <h1>Restablece tu contraseña</h1>
        <p className="auth-description">
          Ingresa tu correo electrónico y te enviaremos instrucciones para recuperar tu acceso.
        </p>

        <form className="auth-form">
          <label className="auth-field">
            <span>Correo electrónico</span>
            <div className="auth-input">
              <FaEnvelope />
              <input type="email" placeholder="tu@correo.com" />
            </div>
          </label>

          <button type="submit" className="btn btn-primary auth-submit">
            Enviar enlace
          </button>
        </form>

        <p className="auth-footer">
          ¿Recordaste tu contraseña? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Recuperacion
