import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope } from 'react-icons/fa'
import systemLogo from '../assets/images.png'
import { useToast } from '../components/Toast.jsx'

function Recuperacion() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [nuevaCredencial, setNuevaCredencial] = useState('')
  const [tipoCredencial, setTipoCredencial] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!token) return

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/recuperacion/validar?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok || !result.ok) throw new Error(result.message || 'El enlace no es válido')
        setTipoCredencial(result.tipo)
      })
      .catch((requestError) => showToast(requestError.message, 'error'))
  }, [token, showToast])

  async function submit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const endpoint = token ? '/api/usuarios/recuperacion/restablecer' : '/api/usuarios/recuperacion'
      const body = token ? { token, nuevaCredencial } : { email }
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'No se pudo completar la solicitud')
      }

      showToast(result.message, 'success')
      if (token) {
        setNuevaCredencial('')
        setTimeout(() => navigate('/login'), 1600)
      }
    } catch (requestError) {
      const errorMessage = requestError.message || 'No se pudo conectar con el servidor'
      showToast(errorMessage, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-back">
          <FaArrowLeft />
          <span>Volver</span>
        </Link>

        <div className="auth-brand">
          <img className="auth-brand-mark" src={systemLogo} alt="Gestión Empresarial" />
          <div>
            <h2>Gestión Empleados</h2>
            <p>Recuperar contraseña</p>
          </div>
        </div>

        <h1>{token ? tipoCredencial === 'pin' ? 'Crea un nuevo PIN' : 'Crea una nueva contraseña' : 'Restablece tu contraseña'}</h1>
        <p className="auth-description">
          {token
            ? tipoCredencial === 'pin'
              ? 'Este enlace pertenece a una cuenta de empleado. Escribe un PIN nuevo de 4 números.'
              : 'Este enlace pertenece a una cuenta administrativa. Escribe una contraseña nueva.'
            : 'Ingresa tu correo electrónico y te enviaremos instrucciones para recuperar tu acceso.'}
        </p>

        <form className="auth-form" onSubmit={submit}>
          {token ? (
            <label className="auth-field">
              <span>{tipoCredencial === 'pin' ? 'Nuevo PIN de empleado' : 'Nueva contraseña de administrador'}</span>
              <div className="auth-input">
                <FaEnvelope />
                <input
                  type={tipoCredencial === 'pin' ? 'text' : 'password'}
                  inputMode={tipoCredencial === 'pin' ? 'numeric' : undefined}
                  placeholder={tipoCredencial === 'pin' ? '1234' : 'Mínimo 8 caracteres'}
                  value={nuevaCredencial}
                  onChange={(event) => setNuevaCredencial(tipoCredencial === 'pin' ? event.target.value.replace(/\D/g, '').slice(0, 4) : event.target.value)}
                  minLength={tipoCredencial === 'pin' ? 4 : 8}
                  maxLength={tipoCredencial === 'pin' ? 4 : 128}
                  required
                />
              </div>
            </label>
          ) : (
            <label className="auth-field">
              <span>Correo electrónico</span>
              <div className="auth-input">
                <FaEnvelope />
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </label>
          )}

          <button type="submit" className="btn btn-primary auth-submit" disabled={isSubmitting || (token && !tipoCredencial)}>
            {isSubmitting ? 'Procesando...' : token ? 'Actualizar credencial' : 'Enviar enlace'}
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
