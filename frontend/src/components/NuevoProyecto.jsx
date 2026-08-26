import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import '../leaflet.css'

export default function NuevoProyecto({ teamMembers = [], onClose = () => {}, onCreated = () => {} }) {
  const [name, setName] = useState('')
  const [assigned, setAssigned] = useState([])
  const [jornada, setJornada] = useState('08:00-17:00')
  const [lat, setLat] = useState(null)
  const [lng, setLng] = useState(null)
  const [radius, setRadius] = useState(50)
  const [savingMessage, setSavingMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const mapContainerRef = useRef(null)

  const isLocationValid = Number.isFinite(lat) && Number.isFinite(lng)

  const center = [-34.6037, -58.3816]

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    mapRef.current = L.map(mapContainerRef.current, {
      center,
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current)

    mapRef.current.on('click', (event) => {
      const { lat: clickedLat, lng: clickedLng } = event.latlng
      setLat(clickedLat)
      setLng(clickedLng)
    })
  }, [])

  useEffect(() => {
    if (!mapRef.current || !isLocationValid) return

    const position = [lat, lng]
    mapRef.current.setView(position, 14)

    if (markerRef.current) {
      markerRef.current.setLatLng(position)
    } else {
      markerRef.current = L.marker(position).addTo(mapRef.current)
    }

    if (circleRef.current) {
      circleRef.current.setLatLng(position).setRadius(Number(radius))
    } else {
      circleRef.current = L.circle(position, {
        radius: Number(radius),
        color: '#3a92ff',
        fillColor: '#3a92ff',
        fillOpacity: 0.2,
      }).addTo(mapRef.current)
    }
  }, [lat, lng])

  useEffect(() => {
    if (!circleRef.current || !isLocationValid) return
    circleRef.current.setRadius(Number(radius))
  }, [radius])

  const toggleAssign = (name) => {
    setAssigned((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]))
  }

  function useMyLocation() {
    if (!navigator.geolocation) return alert('Geolocalización no disponible')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude)
        setLng(p.coords.longitude)
      },
      (err) => alert('No se pudo obtener ubicación: ' + err.message)
    )
  }

  const saveLocalProject = (payload) => {
    try {
      const saved = JSON.parse(localStorage.getItem('localProjects') || '[]')
      saved.push({
        ...payload,
        status: 'Guardado localmente',
        color: 'green',
        assigned_employees: payload.assigned_employees || [],
        savedAt: new Date().toISOString(),
      })
      localStorage.setItem('localProjects', JSON.stringify(saved))
    } catch (error) {
      console.warn('No se pudo guardar el proyecto localmente:', error)
    }
  }

  function submit(e) {
    e.preventDefault()
    if (!isLocationValid) {
      return alert('Selecciona una ubicación válida en el mapa antes de crear el proyecto.')
    }

    setIsSubmitting(true)
    setSavingMessage(null)

    const payload = { name, assigned_employees: assigned, jornada, lat, lng, radius_m: Number(radius) }
    saveLocalProject(payload)
    setSavingMessage('Proyecto guardado localmente.')
    onCreated(payload)
    onClose()
    setIsSubmitting(false)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <header className="modal-card-header">
          <div>
            <h3>Nuevo proyecto</h3>
            <p className="modal-card-subtitle">
              Selecciona la ubicación en el mapa, asigna empleados y guarda la información localmente.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary btn-close">
            Cerrar
          </button>
        </header>

        <form onSubmit={submit} className="project-form">
          <div className="form-section">
            <label>Nombre del proyecto</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-section">
            <div className="section-label-row">
              <label>Asignar empleados</label>
              <span className="section-hint">Selecciona uno o varios colaboradores.</span>
            </div>
            <div className="assign-list">
              {teamMembers.map((m) => (
                <label key={m.name} className="assign-item">
                  <input type="checkbox" checked={assigned.includes(m.name)} onChange={() => toggleAssign(m.name)} />
                  <span>
                    {m.name} <small>{m.role}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>Jornada (ej: 08:00-17:00)</label>
            <input value={jornada} onChange={(e) => setJornada(e.target.value)} />
          </div>

          <div className="form-section">
            <div className="section-label-row">
              <label>Ubicación</label>
              <span className="section-hint">Haz clic en el mapa para fijar la ubicación.</span>
            </div>
            <div className="project-map" ref={mapContainerRef} />
          </div>

          <div className="field-row">
            <input
              className="small-input"
              placeholder="Lat"
              value={lat ?? ''}
              onChange={(e) => setLat(e.target.value.trim() === '' ? null : Number(e.target.value))}
            />
            <input
              className="small-input"
              placeholder="Lng"
              value={lng ?? ''}
              onChange={(e) => setLng(e.target.value.trim() === '' ? null : Number(e.target.value))}
            />
            <input
              className="small-input"
              placeholder="Radio (m)"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={useMyLocation}>
              Usar mi ubicación
            </button>
          </div>

          {isLocationValid && (
            <div className="location-summary">
              <span>Lat: {lat.toFixed(6)}</span>
              <span>Lng: {lng.toFixed(6)}</span>
            </div>
          )}

          {savingMessage && <div className="save-message">{savingMessage}</div>}

          <div className="button-row">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
