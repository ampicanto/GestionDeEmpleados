import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../css/Empleado.simple.css'
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
  FaArrowLeft,
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
  const [registeredAt, setRegisteredAt] = useState(null)
  const [activeSection, setActiveSection] = useState('Inicio')
  const [cameraPermission, setCameraPermission] = useState('unknown') // 'unknown'|'granted'|'denied'|'prompt'
  const [isStarting, setIsStarting] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
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
    setIsCameraActive(false)
    setIsStarting(true)
    try {
      const constraints = { video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setIsCameraActive(true)
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
    setIsCameraActive(false)
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
    if (!streamRef.current) return

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
    setIsCameraActive(false)

    try {
      setAttendanceStatus('saving')
      const result = await saveAttendance(data)
      setAttendanceStatus('saved')
      setRegisteredAt(new Date())
      setAttendanceMessage(`${result.message}. Registro guardado con ubicación y hora.`)
    } catch (error) {
      setAttendanceStatus('error')
      setAttendanceMessage(error.message || 'No se pudo registrar la asistencia')
    }
  }

  return (
    <div className="empleado-simple">
      <header className="emp-header">
        <div className="emp-header-content">
          <span className="emp-logo">IC</span>
          <div>
            <h1>¡Hola, {user.nombre || 'Empleado'}!</h1>
            <p>{activeSection}</p>
          </div>
        </div>
      </header>

      <main className="emp-content">
        {activeSection === 'Inicio' && (
          <section className="emp-section">
            <h2>Marcar entrada</h2>
            <p className="emp-description">Toma una selfie para registrar tu asistencia</p>
            
            <div className="camera-box">
              <div className="camera-status">
                {cameraPermission === 'granted' && <div className="status-ok"><FaCheckCircle /> Cámara autorizada</div>}
                {cameraPermission === 'denied' && <div className="status-error"><FaBan /> Cámara denegada</div>}
              </div>

              <div className="camera-display">
                <video ref={videoRef} className="video-feed" playsInline muted />
                {!isCameraActive && !selfieData && <div className="camera-overlay">📸 Activa la cámara</div>}
                {selfieData && <img src={selfieData} alt="Tu selfie" className="selfie-preview" />}
              </div>

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="camera-controls">
                <button 
                  onClick={isCameraActive ? captureSelfie : () => startStream(selectedDeviceId)}
                  className="btn-action"
                  disabled={isStarting || attendanceStatus === 'saving'}
                >
                  <FaCamera /> {isCameraActive ? 'Capturar' : 'Abrir cámara'}
                </button>
                
                {isCameraActive && (
                  <button onClick={stopCamera} className="btn-secondary">
                    <FaBan /> Cerrar
                  </button>
                )}
              </div>

              <div className={`status-box status-${attendanceStatus}`}>
                {attendanceStatus === 'saved' && <><FaCheckCircle /> Registrado</>}
                {attendanceStatus === 'error' && <><FaBan /> Error</>}
                {attendanceStatus === 'saving' && <><FaSpinner className="spin" /> Guardando...</>}
                {attendanceStatus === 'idle' && <>Pendiente</>}
              </div>

              {attendanceMessage && <p className="msg">{attendanceMessage}</p>}
            </div>
          </section>
        )}

        {activeSection === 'Asistencias' && (
          <section className="emp-section">
            <h2>Mis asistencias</h2>
            <p className="emp-description">Historial de registros</p>
            
            <div className="card-simple">
              <span>Estado hoy</span>
              <strong>{attendanceStatus === 'saved' ? '✓ Registrada' : '○ Pendiente'}</strong>
            </div>
            
            {registeredAt && (
              <div className="card-simple">
                <span>Último registro</span>
                <strong>{registeredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
              </div>
            )}
          </section>
        )}

        {activeSection === 'Sueldo' && (
          <section className="emp-section">
            <h2>Mi sueldo</h2>
            <p className="emp-description">Información de pagos</p>
            
            <div className="empty-box">
              <FaMoneyBillWave size={48} />
              <p>Los datos de sueldo aparecerán aquí</p>
            </div>
          </section>
        )}

        {activeSection === 'Perfil' && (
          <section className="emp-section">
            <h2>Mi perfil</h2>
            <p className="emp-description">Datos de mi cuenta</p>
            
            <div className="profile-box">
              <div className="profile-avatar">{(user.nombre || 'E').charAt(0)}</div>
              <div className="profile-info">
                <div>
                  <span>Nombre</span>
                  <strong>{user.nombre || '-'}</strong>
                </div>
                <div>
                  <span>Rol</span>
                  <strong>{user.rol || 'Empleado'}</strong>
                </div>
                <div>
                  <span>ID</span>
                  <strong>{user.id || '-'}</strong>
                </div>
              </div>
            </div>

            <button onClick={logout} className="btn-logout">
              <FaSignOutAlt /> Cerrar sesión
            </button>
          </section>
        )}
      </main>

      <nav className="emp-bottom-menu">
        {[
          { label: 'Inicio', icon: FaHome },
          { label: 'Asistencias', icon: FaCalendarCheck },
          { label: 'Sueldo', icon: FaMoneyBillWave },
          { label: 'Perfil', icon: FaUserCircle },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`menu-item ${activeSection === label ? 'active' : ''}`}
            onClick={() => setActiveSection(label)}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default Empleado