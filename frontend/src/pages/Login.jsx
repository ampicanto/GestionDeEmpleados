import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'

function Login() {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const isEmail = credential.includes('@')
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEmail 
            ? { email: credential, password } 
            : { dni: credential, pin: password }
        ),
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Usuario o contraseña incorrectos')
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
    <div className="login-simple">
      <Link to="/" className="login-back">
        <FaArrowLeft /> Volver
      </Link>

      <div className="login-container">
        <div className="login-logo">IC</div>
        <h1>Ingenio Constructora</h1>
        <p className="login-subtitle">Iniciar sesión</p>

        <form onSubmit={submit} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Correo o DNI"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Contraseña o PIN"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '...' : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/recuperacion">¿Olvidaste tu contraseña?</Link>
          <Link to="/registro">Crear cuenta</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
