import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Empleado.css'
import {
  FaCamera,
  FaCheckCircle,
  FaBan,
  FaSpinner,
  FaSyncAlt,
  FaHome,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaUserCircle,
  FaSignOutAlt,
} from 'react-icons/fa'

function Empleado() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [selfieData, setSelfieData] = useState(null)
  const [attendanceStatus, setAttendanceStatus] = useState('idle')
  const [attendanceMessage, setAttendanceMessage] = useState('')
  const [activeSection, setActiveSection] = useState('Inicio')
  const [cameraPermission, setCameraPermission] = useState('unknown') // 'unknown'|'granted'|'denied'|'prompt'
  const [isStarting, setIsStarting] = useState(false)
  const streamRef = useRef(null)
  const user = JSON.parse(localStorage.getItem('authUser') || '{}')

  const navigationItems = [
    { label: 'Inicio', icon: FaHome },
    { label: 'Asistencias', icon: FaCalendarCheck },
    { label: 'Sueldo', icon: FaMoneyBillWave },
    { label: 'Perfil', icon: FaUserCircle },
  ]

  useEffect(() => {
    async function getDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = list.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId)
        }
      } catch (e) {
        console.error('No se pudieron enumerar dispositivos', e)
      }
    }

    async function checkPerm() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: 'camera' })
          setCameraPermission(p.state)
          p.onchange = () => setCameraPermission(p.state)
        }
      } catch (e) {
        // no permission API
      }
    }

    getDevices()
    checkPerm()

    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const startStream = async (deviceId) => {
    stopStream()
    setIsStarting(true)
    try {
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setCameraPermission('granted')
      setIsStarting(false)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (e) {
      setIsStarting(false)
      if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
        setCameraPermission('denied')
      }
      console.error('Error arrancando la cámara', e)
      alert('No se pudo acceder a la cámara. Revisa permisos en tu navegador.')
    }
  }

  const handleDeviceChange = async (e) => {
    const id = e.target.value
    setSelectedDeviceId(id)
    await startStream(id)
  }

  const stopCamera = () => {
    stopStream()
  }

  const logout = () => {
    stopStream()
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    navigate('/login')
  }

  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tu navegador no permite obtener la ubicación'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => reject(new Error('Necesitamos permiso para obtener tu ubicación')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })

  const saveAttendance = async (photo) => {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión')

    const coords = await getLocation()
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        foto: photo,
        latitud: coords.latitude,
        longitud: coords.longitude,
      }),
    })
    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'No se pudo registrar la asistencia')
    }

    return result
  }

  const captureSelfie = async () => {
    setAttendanceStatus('capturing')
    setAttendanceMessage('')
    await startStream(selectedDeviceId)
    if (!videoRef.current || !streamRef.current) {
      setAttendanceStatus('idle')
      return
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/png')
    setSelfieData(data)
    stopStream()

    try {
      setAttendanceStatus('saving')
      const result = await saveAttendance(data)
      setAttendanceStatus('saved')
      setAttendanceMessage(`${result.message}. Registro guardado con ubicación y hora.`)
    } catch (error) {
      setAttendanceStatus('error')
      setAttendanceMessage(error.message || 'No se pudo registrar la asistencia')
    }
  }

  return (
    <div className="empleado-page">
      <div className="empleado-shell">
        <aside className="empleado-sidebar">
          <div className="empleado-brand">
            <span className="empleado-brand-mark">IC</span>
            <div><strong>Ingenio</strong><span>Portal empleado</span></div>
          </div>
          <div className="empleado-user-mini">
            <div className="empleado-avatar">{(user.nombre || 'E').charAt(0).toUpperCase()}</div>
            <div><strong>{user.nombre || 'Empleado'}</strong><span>Jornada activa</span></div>
          </div>
          <nav className="empleado-nav" aria-label="Navegación del empleado">
            {navigationItems.map(({ label, icon: Icon }) => (
              <button key={label} type="button" className={`empleado-nav-item ${activeSection === label ? 'active' : ''}`} onClick={() => setActiveSection(label)}>
                <Icon /><span>{label}</span>
              </button>
            ))}
          </nav>
          <button type="button" className="empleado-logout" onClick={logout}><FaSignOutAlt /><span>Cerrar sesión</span></button>
        </aside>

        <main className="empleado-container">
          {activeSection === 'Inicio' && (
            <>
              <div className="empleado-header">
                <div><p className="empleado-kicker">Control de asistencia</p><h1>Marca tu entrada con una selfie</h1><div className="empleado-sub">Colócate frente a la cámara y toma una foto para registrar tu asistencia.</div></div>
                <div className="permission-status">
                  {isStarting ? <div className="perm-item"><FaSpinner className="spin" /> Solicitando cámara...</div> : cameraPermission === 'granted' ? <div className="perm-item"><FaCheckCircle /> Cámara autorizada</div> : cameraPermission === 'denied' ? <div className="perm-item"><FaBan /> Cámara denegada</div> : <div className="perm-item">Estado de cámara: {cameraPermission}</div>}
                </div>
              </div>
              <div className="camera-area">
                <div className="camera-card">
                  <div className="camera-heading"><div><span className="camera-label">Cámara frontal</span><h2>{attendanceStatus === 'saved' ? 'Asistencia registrada' : 'Prepara tu selfie'}</h2></div><FaCamera /></div>
                  <div className="camera-frame">
                    <video ref={videoRef} className="camera-video" playsInline muted />
                    {!isStarting && !streamRef.current && !selfieData && <div className="camera-placeholder">Pulsa el botón para activar la cámara</div>}
                    {selfieData && <img src={selfieData} alt="Selfie capturada" className="captured-selfie" />}
                  </div>
                  <canvas ref={canvasRef} className="camera-canvas" style={{ display: 'none' }} />
                  <div className="camera-actions">
                    <select aria-label="Seleccionar cámara" value={selectedDeviceId || ''} onChange={handleDeviceChange}>{devices.map((d) => <option value={d.deviceId} key={d.deviceId}>{d.label || `Cámara ${d.deviceId}`}</option>)}</select>
                    <button onClick={captureSelfie} className="btn" disabled={isStarting || attendanceStatus === 'capturing' || attendanceStatus === 'saving'}>{isStarting ? <FaSpinner className="spin" /> : <FaCamera />}{isStarting ? 'Abriendo cámara...' : attendanceStatus === 'saving' ? 'Guardando asistencia...' : 'Tomar selfie y marcar asistencia'}</button>
                    {streamRef.current && <button onClick={stopCamera} className="btn btn-secondary"><FaBan />Detener cámara</button>}
                  </div>
                </div>
                <div className="sidebar-card">
                  <div className="status-icon"><FaCheckCircle /></div><span className="camera-label">Estado de registro</span><h3>{attendanceStatus === 'saved' ? 'Asistencia registrada' : attendanceStatus === 'error' ? 'No se pudo registrar' : 'Aún no registrada'}</h3>
                  <p className="empleado-sub">{attendanceMessage || 'Necesitamos una selfie clara, con tu rostro visible y buena iluminación.'}</p>
                  {(attendanceStatus === 'saved' || attendanceStatus === 'error') && <button type="button" className="retake-button" onClick={() => { setSelfieData(null); setAttendanceStatus('idle'); setAttendanceMessage('') }}><FaSyncAlt /> Tomar otra selfie</button>}
                  <div className="capture-notes"><span><FaCheckCircle /> Rostro visible</span><span><FaCheckCircle /> Buena iluminación</span><span><FaCheckCircle /> Cámara autorizada</span></div>
                </div>
              </div>
            </>
          )}

          {activeSection === 'Asistencias' && <section className="empleado-section-view"><p className="empleado-kicker">Historial</p><h1>Mis asistencias</h1><p className="empleado-sub">Consulta el estado de tus registros de entrada y salida.</p><div className="summary-grid"><article className="summary-card"><span>Estado de hoy</span><strong>{attendanceStatus === 'saved' ? 'Registrada' : 'Pendiente'}</strong><small>{attendanceMessage || 'Aún no hay un fichaje en esta sesión.'}</small></article><article className="summary-card"><span>Último registro</span><strong>{attendanceStatus === 'saved' ? 'Guardado ahora' : 'Sin registros'}</strong><small>La hora y ubicación se guardan automáticamente.</small></article></div><button type="button" className="btn section-action" onClick={() => setActiveSection('Inicio')}><FaCamera /> Registrar asistencia</button></section>}
          {activeSection === 'Sueldo' && <section className="empleado-section-view"><p className="empleado-kicker">Información laboral</p><h1>Mi sueldo</h1><p className="empleado-sub">Aquí podrás consultar tus pagos y recibos cuando estén disponibles.</p><div className="empty-state"><FaMoneyBillWave /><strong>Información pendiente</strong><span>Tu empresa todavía no ha cargado datos de sueldo.</span></div></section>}
          {activeSection === 'Perfil' && <section className="empleado-section-view"><p className="empleado-kicker">Cuenta personal</p><h1>Mi perfil</h1><p className="empleado-sub">Datos asociados a tu cuenta de empleado.</p><div className="profile-card"><div className="profile-avatar">{(user.nombre || 'E').charAt(0).toUpperCase()}</div><div><span>Nombre completo</span><strong>{user.nombre || 'No disponible'}</strong></div><div><span>Rol</span><strong>{user.rol || 'Empleado'}</strong></div><div><span>ID de usuario</span><strong>{user.id || 'No disponible'}</strong></div></div></section>}
        </main>
      </div>
    </div>
  )
}

export default Empleado