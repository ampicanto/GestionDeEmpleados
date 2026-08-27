import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaIdCard } from 'react-icons/fa'

function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [loginType, setLoginType] = useState('admin')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginType === 'admin' ? { email, password } : { dni, pin }),
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo iniciar sesión')
      }

      localStorage.setItem('authToken', result.token)
      localStorage.setItem('authUser', JSON.stringify(result.data))
      navigate(result.data.rol_id === 3 ? '/empleado' : '/admin')
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
            <p>Acceso seguro</p>
          </div>
        </div>

        <h1>Iniciar sesión</h1>
        <p className="auth-description">
          Ingresa tus credenciales para entrar al panel de proyectos y operaciones.
        </p>

        <div className="auth-mode-toggle">
          <button type="button" className={loginType === 'admin' ? 'active' : ''} onClick={() => setLoginType('admin')}>Administrador</button>
          <button type="button" className={loginType === 'empleado' ? 'active' : ''} onClick={() => setLoginType('empleado')}>Empleado</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {loginType === 'admin' ? (
            <label className="auth-field">
              <span>Correo electrónico</span>
              <div className="auth-input">
                <FaEnvelope />
                <input type="email" placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </label>
          ) : (
            <>
              <label className="auth-field">
                <span>DNI</span>
                <div className="auth-input">
                  <FaIdCard />
                  <input type="text" placeholder="12345678" value={dni} onChange={(event) => setDni(event.target.value)} required />
                </div>
              </label>
              <label className="auth-field">
                <span>PIN</span>
                <div className="auth-input">
                  <FaLock />
                  <input type="password" inputMode="numeric" placeholder="1234" value={pin} onChange={(event) => setPin(event.target.value)} required />
                </div>
              </label>
            </>
          )}

          {loginType === 'admin' && (
            <label className="auth-field">
              <span>Contraseña</span>
              <div className="auth-input">
                <FaLock />
                <input type={showPassword ? 'text' : 'password'} placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} required />
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
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Entrar'}
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
