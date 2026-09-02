import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaIdCard, FaCamera, FaImage } from 'react-icons/fa'

function Registro() {
  const [accountType, setAccountType] = useState('empleado')
  const [showPassword, setShowPassword] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [fotoDni, setFotoDni] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const navigate = useNavigate()

  function handleFileChange(event, setFunction) {
    const file = event.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Las imágenes deben pesar menos de 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setFunction(reader.result)
    }
    reader.readAsDataURL(file)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    if (pin !== confirmPin) {
      setError(accountType === 'admin' ? 'Las contraseñas no coinciden' : 'Los PIN no coinciden')
      return
    }

    if (accountType === 'admin' && pin.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/${accountType === 'admin' ? 'registro-admin' : 'registro'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountType === 'admin'
          ? { nombre, email, password: pin }
          : { nombre, email, dni, pin, foto_perfil: fotoPerfil, foto_dni: fotoDni }),
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

        <div className="auth-mode-toggle" aria-label="Tipo de cuenta">
          <button type="button" className={accountType === 'empleado' ? 'active' : ''} onClick={() => setAccountType('empleado')}>
            Empleado
          </button>
          <button type="button" className={accountType === 'admin' ? 'active' : ''} onClick={() => setAccountType('admin')}>
            Administrador
          </button>
        </div>

        <h1>Crear cuenta de {accountType === 'admin' ? 'administrador' : 'empleado'}</h1>
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

          {accountType === 'empleado' && (
            <label className="auth-field">
              <span>DNI</span>
              <div className="auth-input">
                <FaIdCard />
                <input name="dni" autoComplete="off" type="text" inputMode="numeric" pattern="[0-9]{4,20}" maxLength={20} placeholder="12345678" value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, ''))} required />
              </div>
            </label>
          )}

          {accountType === 'empleado' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '0.5rem 0' }}>
            <label className="auth-field" style={{ margin: 0 }}>
              <span>Foto de Perfil</span>
              <div className="auth-input" style={{ position: 'relative', cursor: 'pointer' }}>
                <FaCamera />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setFotoPerfil)}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fotoPerfil ? 'Cargada ✓' : 'Seleccionar'}
                </span>
              </div>
              {fotoPerfil && (
                <img src={fotoPerfil} alt="Preview perfil" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', marginTop: '6px' }} />
              )}
            </label>

            <label className="auth-field" style={{ margin: 0 }}>
              <span>Foto del DNI</span>
              <div className="auth-input" style={{ position: 'relative', cursor: 'pointer' }}>
                <FaImage />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, setFotoDni)}
                  style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fotoDni ? 'Cargada ✓' : 'Seleccionar'}
                </span>
              </div>
              {fotoDni && (
                <img src={fotoDni} alt="Preview DNI" style={{ width: '65px', height: '45px', borderRadius: '4px', objectFit: 'cover', marginTop: '6px' }} />
              )}
            </label>
          </div>}

          <label className="auth-field">
            <span>{accountType === 'admin' ? 'Contraseña' : 'PIN de acceso'}</span>
            <div className="auth-input auth-input-password">
              <FaLock />
              <input type={showPassword ? 'text' : 'password'} inputMode={accountType === 'admin' ? undefined : 'numeric'} placeholder={accountType === 'admin' ? 'Mínimo 8 caracteres' : '1234'} value={pin} onChange={(event) => setPin(accountType === 'admin' ? event.target.value : event.target.value.replace(/\D/g, ''))} minLength={accountType === 'admin' ? 8 : 4} maxLength={accountType === 'admin' ? undefined : 8} required />
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
            <span>{accountType === 'admin' ? 'Repetir contraseña' : 'Repetir PIN'}</span>
            <div className="auth-input">
              <FaLock />
              <input type="password" inputMode={accountType === 'admin' ? undefined : 'numeric'} placeholder={accountType === 'admin' ? 'Repite la contraseña' : '1234'} value={confirmPin} onChange={(event) => setConfirmPin(accountType === 'admin' ? event.target.value : event.target.value.replace(/\D/g, ''))} minLength={accountType === 'admin' ? 8 : 4} maxLength={accountType === 'admin' ? undefined : 8} required />
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