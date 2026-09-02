import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import {
  FaChartBar,
  FaUsers,
  FaHardHat,
  FaBell,
  FaCog,
  FaSearch,
  FaPlus,
  FaChevronRight,
  FaFileExcel,
  FaTimes,
  FaIdCard,
} from 'react-icons/fa'
import NuevoProyecto from '../components/NuevoProyecto'

const summaryCards = [
  { title: 'Proyectos activos', value: '24', detail: '+6 esta semana', icon: <FaHardHat /> },
  { title: 'Equipo asignado', value: '18', detail: '3 disponibles', icon: <FaUsers /> },
  { title: 'Indicador de obra', value: '87%', detail: 'Cumplimiento sólido', icon: <FaChartBar /> },
]

const pendingTasks = [
  { title: 'Revisión de permisos', time: 'Hoy · 09:00' },
  { title: 'Actualización de cronograma', time: 'Hoy · 12:30' },
  { title: 'Seguimiento de seguridad', time: 'Mañana · 08:00' },
]

const recentProjects = [
  {
    name: 'Planta de procesamiento',
    status: 'En ejecución',
    color: 'green',
    assigned_employees: ['Carlos Méndez', 'Mónica Ruiz'],
    attendance: '2/2 presentes',
  },
  {
    name: 'Infraestructura logística',
    status: 'En revisión',
    color: 'blue',
    assigned_employees: ['Luis Ortega'],
    attendance: '1/1 presente',
  },
  {
    name: 'Obras de acceso',
    status: 'Completado',
    color: 'gray',
    assigned_employees: [],
    attendance: '0/0 presentes',
  },
]

function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('Inicio')
  const [search, setSearch] = useState('')
  const [doneTasks, setDoneTasks] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [localProjects, setLocalProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  const [selectedMemberModal, setSelectedMemberModal] = useState(null)

  useEffect(() => {
    loadProjects()
    loadEmployees()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/projects`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      if (!response.ok) throw new Error('No se pudieron cargar los proyectos')
      setLocalProjects(await response.json())
    } catch (error) {
      console.error(error)
      setLocalProjects([])
    }
  }

  const loadEmployees = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/empleados`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'No se pudieron cargar los empleados')
      setTeamMembers((result.data || []).map((employee) => ({
        ...employee,
        name: employee.nombre || employee.name || 'Empleado sin nombre',
        role: employee.puesto || employee.rol || 'Empleado',
      })))
    } catch (error) {
      console.error(error)
      setTeamMembers([])
    }
  }

  const descargarExcel = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/exportaciones/empleados`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Error al generar el archivo Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nomina_Empleados_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert(error.message || 'No se pudo descargar el archivo Excel')
    } finally {
      setIsExporting(false)
    }
  }

  const normalizedSearch = search.toLowerCase()

  const filteredProjects = useMemo(
    () =>
      [...localProjects, ...recentProjects]
        .map((project) => ({
          ...project,
          assigned_employees: project.assigned_employees || [],
          attendance:
            project.attendance ||
            `${(project.assigned_employees || []).length}/${(project.assigned_employees || []).length} presentes`,
        }))
        .filter((project) =>
          [project.name, project.status, project.jornada, project.lat?.toString(), project.lng?.toString()]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        ),
    [localProjects, normalizedSearch]
  )

  const filteredTasks = useMemo(
    () =>
      pendingTasks.filter((task) =>
        [task.title, task.time].some((value) => value.toLowerCase().includes(normalizedSearch))
      ),
    [normalizedSearch]
  )

  const filteredMembers = useMemo(
    () =>
      teamMembers.filter((member) =>
        [member.name, member.role, member.puesto, member.rol, member.dni]
          .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      ),
    [teamMembers, normalizedSearch]
  )

  const toggleTask = (title) => {
    setDoneTasks((prev) => (prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]))
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    setShowSettingsMenu(false)
    navigate('/login')
  }

  const heroCopy = {
    Inicio: {
      title: 'Bienvenido al centro de control de operaciones.',
      text: 'Monitorea proyectos, supervisa al equipo y mantén visibilidad de cada avance en tiempo real.',
      badge: 'Resumen ejecutivo',
    },
    Proyectos: {
      title: 'Gestiona los proyectos con una vista clara del avance.',
      text: 'Revisa el estado de cada obra, prioriza tareas y mantén el ritmo de ejecución bajo control.',
      badge: 'Vista de proyectos',
    },
    Equipo: {
      title: 'Coordina al equipo con información de apoyo en tiempo real.',
      text: 'Observa colaboradores, roles y cargas de trabajo desde un panel ágil y ordenado.',
      badge: 'Gestión de equipo',
    },
    Reportes: {
      title: 'Consulta indicadores clave para tomar decisiones.',
      text: 'Analiza desempeño, cumplimiento y avance general con datos exportables a Excel.',
      badge: 'Reportes',
    },
    Configuración: {
      title: 'Ajusta las preferencias del panel operativo.',
      text: 'Configura módulos, alertas y estructura del entorno sin cambiar la experiencia del usuario.',
      badge: 'Configuración',
    },
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">IC</div>
          <div>
            <h2>Ingenio Constructora</h2>
            <p>Panel administrativo</p>
          </div>
        </div>

        <nav className="admin-nav">
          {['Inicio', 'Proyectos', 'Equipo', 'Reportes', 'Configuración'].map((item) => (
            <button
              key={item}
              type="button"
              className={`admin-nav-item ${activeSection === item ? 'active' : ''}`}
              onClick={() => setActiveSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-card">
          <p className="sidebar-label">Estado del sistema</p>
          <h3>Operación estable</h3>
          <p>Todos los módulos principales están disponibles y sincronizados.</p>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar proyecto, colaborador o DNI"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="admin-topbar-actions">
            {/* Botón Exportar a Excel */}
            <button
              type="button"
              className="admin-primary-btn"
              style={{ backgroundColor: '#198754', borderColor: '#198754' }}
              onClick={descargarExcel}
              disabled={isExporting}
            >
              <FaFileExcel />
              <span>{isExporting ? 'Exportando...' : 'Exportar Excel'}</span>
            </button>

            <div className="settings-menu-wrapper">
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => {
                  setShowNotifications((prev) => !prev)
                  setShowSettingsMenu(false)
                }}
              >
                <FaBell />
              </button>
              {showNotifications && (
                <div className="notification-menu">
                  <div className="notification-header">Notificaciones</div>
                  <button type="button" className="notification-item">Nuevo mensaje de obra</button>
                  <button type="button" className="notification-item">Permisos pendientes para revisión</button>
                  <button type="button" className="notification-item">Actualización de cronograma disponible</button>
                  <button type="button" className="notification-small-btn" onClick={() => setShowNotifications(false)}>Cerrar</button>
                </div>
              )}
            </div>
            <div className="settings-menu-wrapper">
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => {
                  setShowSettingsMenu((prev) => !prev)
                  setShowNotifications(false)
                }}
              >
                <FaCog />
              </button>
              {showSettingsMenu && (
                <div className="settings-menu">
                  <button type="button" className="settings-menu-item" onClick={logout}>Cerrar sesión</button>
                </div>
              )}
            </div>
            <button type="button" className="admin-primary-btn" onClick={() => setShowNew(true)}>
              <FaPlus />
              <span>Nuevo proyecto</span>
            </button>
          </div>
        </header>

        <section className="admin-hero">
          <div>
            <p className="eyebrow">{heroCopy[activeSection].badge}</p>
            <h1>{heroCopy[activeSection].title}</h1>
            <p className="admin-hero-text">{heroCopy[activeSection].text}</p>
          </div>
          <div className="admin-hero-card">
            <p>Progreso general</p>
            <strong>82%</strong>
            <span>Planificación y obras en marcha</span>
          </div>
        </section>

        <section className="admin-grid">
          {summaryCards.map((card) => (
            <article className="admin-card" key={card.title}>
              <div className="admin-card-icon">{card.icon}</div>
              <div>
                <h3>{card.value}</h3>
                <p>{card.title}</p>
                <span>{card.detail}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="admin-grid admin-grid-2">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="eyebrow">Tareas pendientes</p>
                <h2>Actividad prioritaria</h2>
              </div>
              <button type="button" className="admin-link-btn">
                Ver todo <FaChevronRight />
              </button>
            </div>

            <div className="admin-list">
              {filteredTasks.map((task) => {
                const isDone = doneTasks.includes(task.title)
                return (
                  <div className="admin-list-item" key={task.title}>
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.time}</p>
                    </div>
                    <div className="admin-task-actions">
                      <span className={`admin-pill ${isDone ? 'done' : ''}`}>{isDone ? 'Completada' : 'Pendiente'}</span>
                      <button type="button" className="admin-link-btn small" onClick={() => toggleTask(task.title)}>
                        {isDone ? 'Deshacer' : 'Marcar'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {filteredTasks.length === 0 && <p className="admin-empty-state">No hay tareas que coincidan con la búsqueda.</p>}
            </div>
          </div>

          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="eyebrow">Proyectos</p>
                <h2>Avances recientes</h2>
              </div>
            </div>

            <div className="admin-project-list">
              {filteredProjects.map((project) => (
                <div className="admin-project-item" key={project.name}>
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.status}</p>
                    <div className="project-attendance">Asistencia: {project.attendance}</div>
                    {project.assigned_employees.length > 0 && (
                      <div className="project-employees">Empleados: {project.assigned_employees.join(', ')}</div>
                    )}
                  </div>
                  <span className={`project-dot ${project.color}`} />
                </div>
              ))}
              {filteredProjects.length === 0 && <p className="admin-empty-state">No hay proyectos que coincidan con la búsqueda.</p>}
            </div>
          </div>
        </section>

        <section className="admin-panel admin-team-panel">
          <div className="admin-panel-header">
            <div>
              <p className="eyebrow">Equipo</p>
              <h2>Colaboradores destacados ({filteredMembers.length})</h2>
            </div>
            <button
              type="button"
              className="admin-link-btn"
              onClick={descargarExcel}
              style={{ color: '#198754' }}
            >
              <FaFileExcel /> Descargar Nómina
            </button>
          </div>

          <div className="admin-team-list">
            {filteredMembers.map((member) => (
              <div
                className="admin-team-item"
                key={member.id || member.name}
                onClick={() => setSelectedMemberModal(member)}
                style={{ cursor: 'pointer' }}
                title="Clic para ver documentos de identidad"
              >
                {member.foto_perfil ? (
                  <img
                    src={member.foto_perfil}
                    alt={member.name}
                    className="admin-avatar"
                    style={{ objectFit: 'cover', borderRadius: '50%', width: '40px', height: '40px' }}
                  />
                ) : (
                  <div className="admin-avatar">{String(member.name || 'E').charAt(0).toUpperCase()}</div>
                )}
                <div style={{ flex: 1 }}>
                  <h3>{member.name || 'Empleado sin nombre'}</h3>
                  <p>{member.role || 'Empleado'} {member.dni ? `· DNI: ${member.dni}` : ''}</p>
                </div>
                {member.foto_dni && (
                  <span style={{ fontSize: '0.8rem', color: '#0d6efd', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FaIdCard /> DNI adjunto
                  </span>
                )}
              </div>
            ))}
            {filteredMembers.length === 0 && <p className="admin-empty-state">No hay colaboradores que coincidan con la búsqueda.</p>}
          </div>
        </section>
      </main>

      {/* Modal para ver fotos del empleado */}
      {selectedMemberModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            color: '#333',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            <button
              type="button"
              onClick={() => setSelectedMemberModal(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              <FaTimes />
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem' }}>{selectedMemberModal.name}</h3>
            <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '0.9rem' }}>
              DNI: <strong>{selectedMemberModal.dni || 'No registrado'}</strong> | Rol: {selectedMemberModal.role}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>Foto de Perfil</p>
                {selectedMemberModal.foto_perfil ? (
                  <img
                    src={selectedMemberModal.foto_perfil}
                    alt="Perfil"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px', color: '#999', fontSize: '0.85rem' }}>
                    Sin foto
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>Foto del DNI</p>
                {selectedMemberModal.foto_dni ? (
                  <img
                    src={selectedMemberModal.foto_dni}
                    alt="DNI"
                    style={{ width: '100%', height: '140px', objectFit: 'contain', background: '#000', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px', color: '#999', fontSize: '0.85rem' }}>
                    Sin DNI
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <NuevoProyecto
          teamMembers={teamMembers}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            loadProjects()
          }}
        />
      )}
    </div>
  )
}

export default AdminPage