import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaIdCard } from 'react-icons/fa'

function Registro() {
  const [showPassword, setShowPassword] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (pin !== confirmPin) {
      setError('Los PIN no coinciden')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, dni, pin }),
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo crear la cuenta')
      }

      setIsCreated(true)
      setTimeout(() => navigate('/login'), 1200)
    } catch (requestError) {
      setError(requestError.message || 'No se pudo conectar con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

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

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Nombre completo</span>
            <div className="auth-input">
              <FaUser />
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
            </div>
          </label>

          <label className="auth-field">
            <span>Correo electrónico</span>
            <div className="auth-input">
              <FaEnvelope />
              <input name="email" autoComplete="email" type="email" placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </label>

          <label className="auth-field">
            <span>DNI</span>
            <div className="auth-input">
              <FaIdCard />
              <input name="dni" autoComplete="off" type="text" inputMode="numeric" pattern="[0-9]{4,20}" maxLength={20} placeholder="12345678" value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, ''))} required />
            </div>
          </label>

          <label className="auth-field">
            <span>PIN de acceso</span>
            <div className="auth-input auth-input-password">
              <FaLock />
              <input type={showPassword ? 'text' : 'password'} inputMode="numeric" placeholder="1234" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} minLength={4} maxLength={8} required />
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

          <label className="auth-field">
            <span>Repetir PIN</span>
            <div className="auth-input">
              <FaLock />
              <input type="password" inputMode="numeric" placeholder="1234" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} minLength={4} maxLength={8} required />
            </div>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {isCreated && <p className="auth-success" role="status">Cuenta creada. Redirigiendo al login...</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting || isCreated}>
            {isSubmitting ? 'Creando cuenta...' : 'Registrarme'}
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
