import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
<<<<<<< HEAD
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaIdCard, FaCamera, FaImage } from 'react-icons/fa'
=======
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaIdCard, FaCamera, FaUpload, FaTrashAlt } from 'react-icons/fa'
import systemLogo from '../assets/images.png'
>>>>>>> origin/rama-nueva

function Registro() {
  const [showPassword, setShowPassword] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [dni, setDni] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
<<<<<<< HEAD
  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [fotoDni, setFotoDni] = useState(null)
=======
  const [fotoDni, setFotoDni] = useState(null)
  const [fotoPerfil, setFotoPerfil] = useState(null)
  const [fotoDniPreview, setFotoDniPreview] = useState('')
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState('')
>>>>>>> origin/rama-nueva
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const navigate = useNavigate()

<<<<<<< HEAD
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

=======
  function handleFileChange(event, setFile, setPreview) {
    const file = event.target.files[0]
    if (!file) return

    setFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result)
    reader.readAsDataURL(file)
  }

  function removeFile(setFile, setPreview) {
    setFile(null)
    setPreview('')
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

>>>>>>> origin/rama-nueva
  async function submit(event) {
    event.preventDefault()
    setError('')

    if (pin !== confirmPin) {
      setError('Los PIN no coinciden')
      return
    }

    if (!fotoDni || !fotoPerfil) {
      setError('Debes subir una foto del DNI y una foto de perfil')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('nombre', nombre)
      formData.append('email', email)
      formData.append('dni', dni)
      formData.append('pin', pin)
      formData.append('fotoDni', fotoDni)
      formData.append('fotoPerfil', fotoPerfil)

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/registro`, {
        method: 'POST',
<<<<<<< HEAD
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          dni,
          pin,
          foto_perfil: fotoPerfil,
          foto_dni: fotoDni,
        }),
=======
        body: formData,
>>>>>>> origin/rama-nueva
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
      <div className="auth-card auth-register-card">
        <Link to="/" className="auth-back">
          <FaArrowLeft />
          <span>Volver</span>
        </Link>

        <div className="auth-brand">
          <img className="auth-brand-mark" src={systemLogo} alt="Gestión Empleados" />
          <div>
            <h2>Gestión Empleados</h2>
            <p>Registro de usuario</p>
          </div>
        </div>

        <h1>Crear cuenta</h1>
        <p className="auth-description">
          Registra tu información para incorporarte al equipo y acceder a la plataforma.
        </p>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Nombre completo</span>
            <div className="auth-input">
              <FaUser />
              <input type="text" placeholder="Tu nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} required />
            </div>
          </label>

          <div className="auth-field file-upload-field">
            <span>Foto del DNI</span>
            <div className={`file-upload-box ${fotoDni ? 'has-file' : ''}`}>
              {fotoDni ? (
                <>
                  <img src={fotoDniPreview} alt="Vista previa del documento de identidad" className="file-upload-preview" />
                  <div className="file-upload-details">
                    <strong>{fotoDni.name}</strong>
                    <span>{formatFileSize(fotoDni.size)}</span>
                    <div className="file-upload-actions">
                      <label htmlFor="foto-dni-input" className="file-upload-change"><FaUpload /> Cambiar</label>
                      <button type="button" className="file-upload-remove" onClick={() => removeFile(setFotoDni, setFotoDniPreview)}><FaTrashAlt /> Eliminar</button>
                    </div>
                  </div>
                </>
              ) : (
                <label htmlFor="foto-dni-input" className="file-upload-empty">
                  <FaIdCard />
                  <strong>Selecciona la foto del DNI</strong>
                  <span>JPG, PNG o WEBP</span>
                </label>
              )}
              <input id="foto-dni-input" className="file-upload-input" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => handleFileChange(event, setFotoDni, setFotoDniPreview)} />
            </div>
          </div>

          <div className="auth-field file-upload-field">
            <span>Foto de perfil</span>
            <div className={`file-upload-box ${fotoPerfil ? 'has-file' : ''}`}>
              {fotoPerfil ? (
                <>
                  <img src={fotoPerfilPreview} alt="Vista previa de la foto de perfil" className="file-upload-preview" />
                  <div className="file-upload-details">
                    <strong>{fotoPerfil.name}</strong>
                    <span>{formatFileSize(fotoPerfil.size)}</span>
                    <div className="file-upload-actions">
                      <label htmlFor="foto-perfil-input" className="file-upload-change"><FaUpload /> Cambiar</label>
                      <button type="button" className="file-upload-remove" onClick={() => removeFile(setFotoPerfil, setFotoPerfilPreview)}><FaTrashAlt /> Eliminar</button>
                    </div>
                  </div>
                </>
              ) : (
                <label htmlFor="foto-perfil-input" className="file-upload-empty">
                  <FaCamera />
                  <strong>Selecciona tu foto de perfil</strong>
                  <span>JPG, PNG o WEBP</span>
                </label>
              )}
              <input id="foto-perfil-input" className="file-upload-input" type="file" accept="image/*" onClick={(event) => { event.currentTarget.value = '' }} onChange={(event) => handleFileChange(event, setFotoPerfil, setFotoPerfilPreview)} />
            </div>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '0.5rem 0' }}>
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
          </div>

          <label className="auth-field">
            <span>PIN de acceso</span>
            <div className="auth-input auth-input-password">
              <FaLock />
              <input type={showPassword ? 'text' : 'password'} inputMode="numeric" placeholder="1234" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} minLength={4} maxLength={4} required />
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
              <input type="password" inputMode="numeric" placeholder="1234" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))} minLength={4} maxLength={4} required />
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