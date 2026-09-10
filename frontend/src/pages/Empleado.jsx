import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import '../css/Empleado.css'
import '../leaflet.css'
import systemLogo from '../assets/images.png'
import { useToast } from '../components/Toast.jsx'
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
  FaHardHat,
  FaFileAlt,
  FaClock,
} from 'react-icons/fa'

function obtenerMinutosInicio(jornada) {
  const match = String(jornada || '').match(/(\d{1,2})\s*[:.]\s*(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function obtenerMinutosFin(jornada) {
  const times = String(jornada || '').match(/\d{1,2}\s*[:.]\s*\d{2}/g)
  if (!times || times.length < 2) return null
  const match = times[1].match(/(\d{1,2})\s*[:.]\s*(\d{2})/)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null
}

function formatearDuracion(minutos) {
  if (!Number.isFinite(minutos) || minutos < 0) return '0 h 0 min'
  return `${Math.floor(minutos / 60)} h ${Math.round(minutos % 60)} min`
}

function obtenerDuracionFichaje(fichajes, index) {
  const record = fichajes[index]
  if (record?.tipo !== 'entrada') return null
  const salida = fichajes.slice(index + 1).find((item) => item.tipo === 'salida')
  if (!salida) return null
  return Math.max(0, (new Date(salida.fecha_hora) - new Date(record.fecha_hora)) / 60000)
}

function EmployeeClock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="employee-clock" aria-label="Hora actual">
      <FaClock />
      <div><strong>{time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong><span>{time.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    </div>
  )
}

function EmployeeProjectMap({ project }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    const lat = Number(project.lat)
    const lng = Number(project.lng)
    if (!mapContainerRef.current || mapRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined

    const map = L.map(mapContainerRef.current, { center: [lat, lng], zoom: 15, zoomControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)
    L.marker([lat, lng]).addTo(map).bindPopup(`<strong>${project.name}</strong>`).openPopup()
    L.circle([lat, lng], {
      radius: Number(project.radius_m || 50),
      color: '#3a92ff',
      fillColor: '#3a92ff',
      fillOpacity: 0.18,
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [project])

  if (!Number.isFinite(Number(project.lat)) || !Number.isFinite(Number(project.lng))) {
    return <div className="employee-map-empty">Este proyecto no tiene una ubicación configurada.</div>
  }

  return <div className="employee-project-map" ref={mapContainerRef} aria-label={`Ubicación de ${project.name}`} />
}

function Empleado() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const user = JSON.parse(localStorage.getItem('authUser') || '{}')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState(null)
  const [selfieData, setSelfieData] = useState(null)
  const [attendanceStatus, setAttendanceStatus] = useState('idle')
  const [attendanceMessage, setAttendanceMessage] = useState('')
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [absenceHistory, setAbsenceHistory] = useState([])
  const [salarySummary, setSalarySummary] = useState(null)
  const [profileData, setProfileData] = useState(user)
  const [employeeProjects, setEmployeeProjects] = useState([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [selectedEmployeeProject, setSelectedEmployeeProject] = useState(null)
  const [showJustification, setShowJustification] = useState(false)
  const [absenceForm, setAbsenceForm] = useState({ fechaInicio: '', fechaFin: '', observaciones: '' })
  const [absenceMessage, setAbsenceMessage] = useState('')
  const [isSendingAbsence, setIsSendingAbsence] = useState(false)
  const [activeSection, setActiveSection] = useState('Inicio')
  const [cameraPermission, setCameraPermission] = useState('unknown') // 'unknown'|'granted'|'denied'|'prompt'
  const [isStarting, setIsStarting] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [locationStatus, setLocationStatus] = useState('unknown')
  const [attendanceFilter, setAttendanceFilter] = useState('todos')
  const [attendancePage, setAttendancePage] = useState(1)
  const [isRefreshingAttendance, setIsRefreshingAttendance] = useState(false)
  const streamRef = useRef(null)
  const startTimes = employeeProjects.map((project) => obtenerMinutosInicio(project.jornada)).filter((time) => time !== null)
  const earliestStart = startTimes.length ? Math.min(...startTimes) : null
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const shiftHasStarted = projectsLoaded && employeeProjects.length > 0 && earliestStart !== null && currentMinutes >= earliestStart
  const canTakeAttendance = shiftHasStarted && locationStatus === 'inside'
  const shiftStartLabel = earliestStart === null ? '' : `${String(Math.floor(earliestStart / 60)).padStart(2, '0')}:${String(earliestStart % 60).padStart(2, '0')}`
  const endTimes = employeeProjects.map((project) => obtenerMinutosFin(project.jornada)).filter((time) => time !== null)
  const shiftEnd = endTimes.length ? Math.max(...endTimes) : null
  const openEntry = attendanceHistory[0]?.tipo === 'entrada' ? attendanceHistory[0] : null
  const minutesUntilEnd = shiftEnd === null ? null : Math.max(0, shiftEnd - currentMinutes)
  const timerLabel = minutesUntilEnd === null
    ? ''
    : `${String(Math.floor(minutesUntilEnd / 60)).padStart(2, '0')}:${String(minutesUntilEnd % 60).padStart(2, '0')}`

  const navigationItems = [
    { label: 'Inicio', icon: FaHome },
    { label: 'Proyectos', icon: FaHardHat },
    { label: 'Asistencias', icon: FaCalendarCheck },
    { label: 'Sueldo', icon: FaMoneyBillWave },
    { label: 'Perfil', icon: FaUserCircle },
  ]

  const attendanceStats = useMemo(() => {
    const entradas = attendanceHistory.filter((record) => record.tipo === 'entrada')
    const salidas = attendanceHistory.filter((record) => record.tipo === 'salida')
    const minutos = attendanceHistory.reduce((total, record, index) => total + (obtenerDuracionFichaje(attendanceHistory, index) || 0), 0)
    return { entradas: entradas.length, salidas: salidas.length, minutos, horasExtra: attendanceHistory.filter((record) => record.es_hora_extra).length }
  }, [attendanceHistory])

  const visibleAttendance = useMemo(() => attendanceHistory.filter((record) => {
    if (attendanceFilter === 'entradas') return record.tipo === 'entrada'
    if (attendanceFilter === 'salidas') return record.tipo === 'salida'
    if (attendanceFilter === 'extra') return record.es_hora_extra
    return true
  }), [attendanceFilter, attendanceHistory])

  const attendancePageSize = 6
  const attendancePageCount = Math.max(1, Math.ceil(visibleAttendance.length / attendancePageSize))
  const paginatedAttendance = visibleAttendance.slice((attendancePage - 1) * attendancePageSize, attendancePage * attendancePageSize)

  useEffect(() => {
    setAttendancePage(1)
  }, [attendanceFilter])

  useEffect(() => {
    if (attendancePage > attendancePageCount) setAttendancePage(attendancePageCount)
  }, [attendancePage, attendancePageCount])

  const refreshAttendance = async () => {
    setIsRefreshingAttendance(true)
    try {
      await Promise.all([loadAttendanceHistory(), loadSalarySummary()])
    } finally {
      setIsRefreshingAttendance(false)
    }
  }

  useEffect(() => {
    const clockInterval = window.setInterval(() => setCurrentTime(new Date()), 30000)

    async function getDevices() {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = list.filter((d) => d.kind === 'videoinput')
        setDevices(videoDevices)
        if (videoDevices.length && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId)
        }
      } catch {
        console.error('No se pudieron enumerar dispositivos')
      }
    }

    async function checkPerm() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const p = await navigator.permissions.query({ name: 'camera' })
          setCameraPermission(p.state)
          p.onchange = () => setCameraPermission(p.state)
        }
      } catch {
        // no permission API
      }
    }

    void Promise.all([
      getDevices(),
      checkPerm(),
      loadAttendanceHistory(),
      loadEmployeeProjects(),
      loadSalarySummary(),
      loadProfile(),
    ])

    return () => {
      window.clearInterval(clockInterval)
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAttendanceHistory = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo cargar el historial')
      setAttendanceHistory(result.fichajes || [])
      setAbsenceHistory(result.ausencias || [])
    } catch (error) {
      console.error('No se pudo cargar el historial de asistencia', error)
      setAbsenceHistory([])
    }
  }

  const loadEmployeeProjects = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes/proyectos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudieron cargar tus proyectos')
      setEmployeeProjects(result.proyectos || [])
    } catch (error) {
      console.error('No se pudieron cargar los proyectos del empleado', error)
    } finally {
      setProjectsLoaded(true)
    }
  }

  const loadSalarySummary = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes/sueldo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo cargar el sueldo')
      setSalarySummary(result.sueldo)
    } catch (error) {
      console.error('No se pudo cargar el sueldo', error)
      setSalarySummary(null)
    }
  }

  const loadProfile = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) return

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/perfil`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo cargar el perfil')
      setProfileData(result.data)
    } catch (error) {
      console.error('No se pudo cargar el perfil', error)
    }
  }

  const submitJustification = async (event) => {
    event.preventDefault()
    setIsSendingAbsence(true)
    setAbsenceMessage('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ausencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(absenceForm),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo enviar la solicitud')
      setAbsenceMessage(result.message)
      setAbsenceForm({ fechaInicio: '', fechaFin: '', observaciones: '' })
    } catch (error) {
      setAbsenceMessage(error.message || 'No se pudo enviar la solicitud')
    } finally {
      setIsSendingAbsence(false)
    }
  }

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
      showToast('No se pudo acceder a la cámara. Revisa permisos en tu navegador.', 'error')
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

  const validateProjectLocation = async (coords) => {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión')

    const params = new URLSearchParams({
      latitud: String(coords.latitude),
      longitud: String(coords.longitude),
    })
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes/validar-ubicacion?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json()
    if (!response.ok || !result.ok || !result.dentroDelRadio) {
      throw new Error(result.message || 'No estás dentro del radio de un proyecto asignado')
    }
    return result
  }

  const refreshLocationStatus = async () => {
    if (!shiftHasStarted) {
      setLocationStatus('unknown')
      return false
    }

    setLocationStatus('checking')
    try {
      const coords = await getLocation()
      const result = await validateProjectLocation(coords)
      setLocationStatus(result.dentroDelRadio ? 'inside' : 'outside')
      return result.dentroDelRadio
    } catch {
      setLocationStatus('error')
      return false
    }
  }

  useEffect(() => {
    if (!shiftHasStarted || activeSection !== 'Inicio') {
      setLocationStatus('unknown')
      return undefined
    }

    refreshLocationStatus()
    const locationInterval = window.setInterval(refreshLocationStatus, 30000)
    return () => window.clearInterval(locationInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, shiftHasStarted])

  useEffect(() => {
    if (!openEntry) return undefined

    const attendanceInterval = window.setInterval(() => {
      void Promise.all([loadAttendanceHistory(), loadSalarySummary()])
    }, 30000)
    return () => window.clearInterval(attendanceInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openEntry?.id])

  const saveAttendance = async (photo, coords) => {
    const token = localStorage.getItem('authToken')
    if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión')

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
    if (!canTakeAttendance) {
      await refreshLocationStatus()
      return
    }

    setAttendanceStatus('capturing')
    setAttendanceMessage('')

    let coords
    try {
      setAttendanceMessage('Comprobando tu ubicación...')
      coords = await getLocation()
      const locationResult = await validateProjectLocation(coords)
      setAttendanceMessage(`${locationResult.message}. Abriendo cámara...`)
    } catch (error) {
      setAttendanceStatus('error')
      setAttendanceMessage(error.message || 'No se pudo validar tu ubicación')
      return
    }

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
      const result = await saveAttendance(data, coords)
      await loadAttendanceHistory()
      await loadSalarySummary()
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
            <img className="empleado-brand-mark" src={systemLogo} alt="Gestión Empleados" />
            <div><strong>Gestión Empleados</strong><span>Portal empleado</span></div>
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
          <EmployeeClock />
          {activeSection === 'Inicio' && (
            <>
              <div className="empleado-header">
                <div><p className="empleado-kicker">Control de asistencia</p><h1>Marca tu entrada con una selfie</h1><div className="empleado-sub">Colócate frente a la cámara y toma una foto para registrar tu asistencia.</div></div>
                <div className="permission-status">
                  {isStarting ? <div className="perm-item"><FaSpinner className="spin" /> Solicitando cámara...</div> : cameraPermission === 'granted' ? <div className="perm-item"><FaCheckCircle /> Cámara autorizada</div> : cameraPermission === 'denied' ? <div className="perm-item"><FaBan /> Cámara denegada</div> : <div className="perm-item">Estado de cámara: {cameraPermission}</div>}
                </div>
              </div>
              {openEntry && shiftEnd !== null && (
                <div className="shift-timer" role="status">
                  <FaClock />
                  <div><strong>{minutesUntilEnd > 0 ? timerLabel : '00:00'}</strong><span>{minutesUntilEnd > 0 ? 'Tiempo restante de jornada' : 'La salida se registrará automáticamente'}</span></div>
                </div>
              )}
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
                    <button onClick={captureSelfie} className="btn" disabled={!canTakeAttendance || isStarting || attendanceStatus === 'capturing' || attendanceStatus === 'saving'}>{isStarting ? <FaSpinner className="spin" /> : <FaCamera />}{!shiftHasStarted ? !projectsLoaded ? 'Cargando jornada...' : employeeProjects.length === 0 ? 'Sin proyecto asignado' : earliestStart === null ? 'Jornada no configurada' : `Disponible desde las ${shiftStartLabel}` : locationStatus === 'checking' ? 'Comprobando ubicación...' : locationStatus === 'outside' ? 'Fuera del radio permitido' : locationStatus === 'error' ? 'Ubicación no disponible' : isStarting ? 'Abriendo cámara...' : attendanceStatus === 'saving' ? 'Guardando asistencia...' : 'Tomar selfie y marcar asistencia'}</button>
                    {streamRef.current && <button onClick={stopCamera} className="btn btn-secondary"><FaBan />Detener cámara</button>}
                  </div>
                </div>
                <div className="sidebar-card">
                  <div className="status-icon"><FaCheckCircle /></div><span className="camera-label">Estado de registro</span><h3>{attendanceStatus === 'saved' ? 'Asistencia registrada' : attendanceStatus === 'error' ? 'No se pudo registrar' : 'Aún no registrada'}</h3>
                  <p className="empleado-sub">{attendanceMessage || 'Necesitamos una selfie clara, con tu rostro visible y buena iluminación.'}</p>
                  {(attendanceStatus === 'saved' || attendanceStatus === 'error') && <button type="button" className="retake-button" onClick={() => { setSelfieData(null); setAttendanceStatus('idle'); setAttendanceMessage('') }}><FaSyncAlt /> Tomar otra selfie</button>}
                  <div className="capture-notes"><span><FaCheckCircle /> Rostro visible</span><span><FaCheckCircle /> Buena iluminación</span><span><FaCheckCircle /> Cámara autorizada</span></div>
                  <button type="button" className="justification-button" onClick={() => { setAbsenceMessage(''); setShowJustification(true) }}><FaFileAlt /> Justificar inasistencia</button>
                </div>
              </div>
            </>
          )}

          {activeSection === 'Proyectos' && (
            <section className="empleado-section-view employee-projects-view">
              <p className="empleado-kicker">Mis obras</p>
              <h1>Proyectos asignados</h1>
              <p className="empleado-sub">Selecciona un proyecto para consultar su ubicación y el radio permitido para registrar asistencia.</p>
              <div className="employee-projects-grid">
                {employeeProjects.map((project) => (
                  <button type="button" className="employee-project-card" key={project.id} onClick={() => setSelectedEmployeeProject(project)}>
                    <span className="employee-project-status">Proyecto asignado</span>
                    <strong>{project.name}</strong>
                    <span>{project.jornada || 'Jornada no definida'}</span>
                    <small>Radio permitido: {project.radius_m || 50} m</small>
                  </button>
                ))}
              </div>
              {employeeProjects.length === 0 && <div className="empty-state"><FaHome /><strong>No tienes proyectos asignados</strong><span>Cuando te asignen una obra, aparecerá aquí con su ubicación.</span></div>}
              {selectedEmployeeProject && (
                <div className="employee-project-location">
                  <div className="employee-location-heading">
                    <div><span className="camera-label">Ubicación del proyecto</span><h2>{selectedEmployeeProject.name}</h2></div>
                    <button type="button" className="retake-button" onClick={() => setSelectedEmployeeProject(null)}>Cerrar mapa</button>
                  </div>
                  <EmployeeProjectMap project={selectedEmployeeProject} />
                </div>
              )}
            </section>
          )}

          {activeSection === 'Asistencias' && (
            <section className="empleado-section-view">
              <p className="empleado-kicker">Historial</p>
              <h1>Mis asistencias</h1>
              <p className="empleado-sub">Consulta tus registros, duración de jornada y horas extra.</p>
              <div className="summary-grid">
                <article className="summary-card"><span>Entradas</span><strong>{attendanceStats.entradas}</strong><small>Fichajes de inicio registrados.</small></article>
                <article className="summary-card"><span>Salidas</span><strong>{attendanceStats.salidas}</strong><small>Incluye salidas automáticas.</small></article>
                <article className="summary-card"><span>Tiempo trabajado</span><strong>{formatearDuracion(attendanceStats.minutos)}</strong><small>Calculado con pares completos.</small></article>
                <article className="summary-card"><span>Horas extra</span><strong>{attendanceStats.horasExtra}</strong><small>Fichajes marcados después de la jornada.</small></article>
              </div>
              <div className="attendance-toolbar">
                <div className="attendance-filters" role="group" aria-label="Filtrar asistencias">
                  {[['todos', 'Todos'], ['entradas', 'Entradas'], ['salidas', 'Salidas'], ['extra', 'Horas extra']].map(([value, label]) => (
                    <button key={value} type="button" className={attendanceFilter === value ? 'active' : ''} onClick={() => setAttendanceFilter(value)}>{label}</button>
                  ))}
                </div>
                <button type="button" className="attendance-refresh" onClick={refreshAttendance} disabled={isRefreshingAttendance}>
                  <FaSyncAlt className={isRefreshingAttendance ? 'spin' : ''} /> {isRefreshingAttendance ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
              <div className="attendance-history">
                {paginatedAttendance.map((record) => (
                  <article className="attendance-record" key={record.id}>
                    {record.foto_data ? <img src={record.foto_data} alt={`Selfie de ${record.tipo}`} loading="lazy" /> : <div className="attendance-photo-placeholder"><FaCamera /></div>}
                    <div className="attendance-record-info">
                      <div className="attendance-record-heading"><strong>{record.tipo === 'entrada' ? 'Entrada' : 'Salida'}{record.es_hora_extra ? ' · Hora extra' : ''}</strong><span>{new Date(record.fecha_hora).toLocaleString('es-ES')}</span></div>
                      {record.tipo === 'entrada' && obtenerDuracionFichaje(attendanceHistory, attendanceHistory.findIndex((item) => item.id === record.id)) !== null && <small>Duración: {formatearDuracion(obtenerDuracionFichaje(attendanceHistory, attendanceHistory.findIndex((item) => item.id === record.id)))}</small>}
                      <small>{record.latitud && record.longitud ? `Ubicación: ${record.latitud}, ${record.longitud}` : 'Ubicación no disponible'}</small>
                      <small>{record.dentro_del_radio ? 'Dentro del radio permitido' : 'Fuera del radio permitido'}</small>
                    </div>
                  </article>
                ))}
                {absenceHistory.map((absence) => (
                  <article className="attendance-record absence-record" key={`absence-${absence.id}`}>
                    <div className="attendance-photo-placeholder absence-placeholder"><FaBan /></div>
                    <div className="attendance-record-info">
                      <div className="attendance-record-heading"><strong>Inasistencia</strong><span>{absence.fecha_inicio === absence.fecha_fin ? absence.fecha_inicio : `${absence.fecha_inicio} al ${absence.fecha_fin}`}</span></div>
                      <small>{absence.tipo === 'falta_injustificada' ? 'No se registró foto durante la jornada' : 'Ausencia justificada'}</small>
                      {absence.observaciones && <small>{absence.observaciones}</small>}
                    </div>
                  </article>
                ))}
                {visibleAttendance.length === 0 && absenceHistory.length === 0 && <div className="empty-state"><FaCalendarCheck /><strong>No hay registros para este filtro</strong><span>Prueba otro filtro o registra una asistencia desde el inicio.</span></div>}
              </div>
              {attendancePageCount > 1 && (
                <div className="attendance-pagination" aria-label="Paginación de asistencias">
                  <button type="button" onClick={() => setAttendancePage((page) => page - 1)} disabled={attendancePage === 1}>Anterior</button>
                  <span>Página {attendancePage} de {attendancePageCount}</span>
                  <button type="button" onClick={() => setAttendancePage((page) => page + 1)} disabled={attendancePage === attendancePageCount}>Siguiente</button>
                </div>
              )}
              <button type="button" className="btn section-action" onClick={() => setActiveSection('Inicio')}><FaCamera /> Registrar asistencia</button>
            </section>
          )}
          {activeSection === 'Sueldo' && (
            <section className="empleado-section-view salary-view">
              <p className="empleado-kicker">Información laboral</p>
              <h1>Mi sueldo</h1>
              <p className="empleado-sub">Acumulado estimado del mes según tus fichajes registrados.</p>
              {salarySummary?.tipo ? (
                <>
                  <div className="salary-highlight">
                    <span>Ganado este mes</span>
                    <strong>{salarySummary.ganado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong>
                    <small>{salarySummary.calculo}</small>
                  </div>
                  <div className="summary-grid salary-summary-grid">
                    <article className="summary-card"><span>Horas trabajadas</span><strong>{salarySummary.horas_trabajadas.toLocaleString('es-ES')}</strong><small>Horas cerradas con entrada y salida.</small></article>
                    <article className="summary-card"><span>Días trabajados</span><strong>{salarySummary.dias_trabajados}</strong><small>Días con fichajes completos.</small></article>
                    <article className="summary-card"><span>Tarifa asignada</span><strong>{salarySummary.tarifa.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong><small>Modalidad: {salarySummary.tipo.replaceAll('_', ' ')}.</small></article>
                  </div>
                  <p className="salary-note">El importe es orientativo y puede diferir de la liquidación final.</p>
                </>
              ) : (
                <div className="empty-state"><FaMoneyBillWave /><strong>Salario pendiente</strong><span>Tu empresa todavía no ha asignado una tarifa o salario.</span></div>
              )}
            </section>
          )}
          {activeSection === 'Perfil' && (
            <section className="empleado-section-view">
              <p className="empleado-kicker">Cuenta personal</p>
              <h1>Mi perfil</h1>
              <p className="empleado-sub">Datos personales asociados a tu cuenta.</p>
              <div className="profile-card employee-profile-card">
                {profileData.foto_perfil_data ? <img className="profile-photo" src={profileData.foto_perfil_data} alt={`Foto de ${profileData.nombre}`} /> : <div className="profile-avatar">{(profileData.nombre || 'E').charAt(0).toUpperCase()}</div>}
                <div><span>Nombre completo</span><strong>{profileData.nombre || 'No disponible'}</strong></div>
                <div><span>DNI</span><strong>{profileData.dni || 'No disponible'}</strong></div>
              </div>
            </section>
          )}
        </main>
      </div>
      {showJustification && (
        <div className="absence-modal-overlay" onClick={() => setShowJustification(false)}>
          <section className="absence-modal" onClick={(event) => event.stopPropagation()}>
            <div className="absence-modal-heading">
              <div><span className="empleado-kicker">Solicitud</span><h2>Justificar inasistencia</h2></div>
              <button type="button" className="absence-close" onClick={() => setShowJustification(false)} aria-label="Cerrar formulario">×</button>
            </div>
            <p className="empleado-sub">Envía las fechas y el motivo para que administración revise tu solicitud.</p>
            <form className="absence-form" onSubmit={submitJustification}>
              <label>Fecha inicial<input type="date" value={absenceForm.fechaInicio} onChange={(event) => setAbsenceForm({ ...absenceForm, fechaInicio: event.target.value })} required /></label>
              <label>Fecha final<input type="date" value={absenceForm.fechaFin} onChange={(event) => setAbsenceForm({ ...absenceForm, fechaFin: event.target.value })} required /></label>
              <label className="absence-form-full">Motivo<textarea value={absenceForm.observaciones} onChange={(event) => setAbsenceForm({ ...absenceForm, observaciones: event.target.value })} minLength={5} rows={4} placeholder="Escribe el motivo de tu ausencia" required /></label>
              {absenceMessage && <p className={`absence-message ${absenceMessage.includes('correctamente') ? 'success' : 'error'}`}>{absenceMessage}</p>}
              <div className="absence-form-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowJustification(false)}>Cancelar</button><button type="submit" className="btn" disabled={isSendingAbsence}>{isSendingAbsence ? 'Enviando...' : 'Enviar solicitud'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default Empleado