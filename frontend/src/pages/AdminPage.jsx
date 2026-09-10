import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../App.css'
import systemLogo from '../assets/images.png'
import {
  FaBell,
  FaCog,
  FaSearch,
  FaPlus,
  FaBriefcase,
  FaCamera,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import NuevoProyecto from '../components/NuevoProyecto'
import { activarNotificacionesPush } from '../services/pushNotifications'

function obtenerFechaActual() {
  const fecha = new Date()
  const offset = fecha.getTimezoneOffset()
  return new Date(fecha.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

function normalizarFechaInput(valor) {
  return String(valor || '').slice(0, 10)
}

function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('Inicio')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [pendingNotifications, setPendingNotifications] = useState([])
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [localProjects, setLocalProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [positions, setPositions] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [assignmentError, setAssignmentError] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState([])
  const [absenceReport, setAbsenceReport] = useState([])
  const [reportProjectId, setReportProjectId] = useState('')
  const [reportFrom, setReportFrom] = useState(obtenerFechaActual)
  const [reportTo, setReportTo] = useState(obtenerFechaActual)
  const [reportEmployee, setReportEmployee] = useState('')
  const [reportType, setReportType] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [monthlyExportLoading, setMonthlyExportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [attendancePage, setAttendancePage] = useState(1)
  const [reviewingAbsenceId, setReviewingAbsenceId] = useState(null)
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  useEffect(() => {
    loadProjects()
    loadEmployees()
    loadPositions()
    activarNotificacionesPush().catch((error) => console.error('No se pudieron activar las notificaciones push:', error))
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadPendingNotifications = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ausencias`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
        })
        const result = await response.json()
        if (!response.ok || !isMounted) return
        setPendingNotifications((result.ausencias || []).filter((absence) => absence.estado === 'pendiente' && !absence.notificacion_leida))
      } catch (error) {
        console.error('No se pudieron cargar las notificaciones:', error)
      }
    }

    loadPendingNotifications()
    const notificationTimer = window.setInterval(loadPendingNotifications, 30000)

    return () => {
      isMounted = false
      window.clearInterval(notificationTimer)
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'Reportes') return

    const loadReports = async () => {
      setReportLoading(true)
      setReportError('')
      try {
        const params = new URLSearchParams()
        if (reportProjectId) params.set('proyectoId', reportProjectId)
        if (reportFrom) params.set('desde', reportFrom)
        if (reportTo) params.set('hasta', reportTo)
        const headers = { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        const [attendanceResponse, absenceResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes/reportes/asistencia?${params}`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ausencias?${params}`, { headers }),
        ])
        const response = attendanceResponse
        const result = await response.json()
        const absenceResult = await absenceResponse.json()
        if (!response.ok) throw new Error(result.message || 'No se pudo cargar el reporte')
        if (!absenceResponse.ok) throw new Error(absenceResult.message || 'No se pudieron cargar las ausencias')
        setAttendanceReport(result.registros || [])
        setAbsenceReport(absenceResult.ausencias || [])
      } catch (error) {
        setAttendanceReport([])
        setAbsenceReport([])
        setReportError(error.message)
      } finally {
        setReportLoading(false)
      }
    }

    loadReports()
  }, [activeSection, reportFrom, reportProjectId, reportTo])

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

  const loadPositions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/puestos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'No se pudieron cargar los puestos')
      setPositions(result.data || [])
    } catch (error) {
      console.error(error)
      setPositions([])
    }
  }

  const reviewAbsence = async (absenceId, estado) => {
    setReviewingAbsenceId(absenceId)
    setReportError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ausencias/${absenceId}/revision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ estado }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'No se pudo revisar la solicitud')

      setAbsenceReport((current) => current.map((absence) => (
        absence.id === absenceId
          ? { ...absence, estado, revisado_en: new Date().toISOString() }
          : absence
      )))
      setPendingNotifications((current) => current.filter((absence) => absence.id !== absenceId))
    } catch (error) {
      setReportError(error.message)
    } finally {
      setReviewingAbsenceId(null)
    }
  }

  const openAssignment = (member) => {
    setSelectedMember(member)
    setSelectedPositionId(member.puesto_id ? String(member.puesto_id) : '')
    setSalaryAmount(member.salario_monto ? String(member.salario_monto) : '')
    setAssignmentMessage('')
    setAssignmentError('')
  }

  const saveAssignment = async (event) => {
    event.preventDefault()
    setIsSavingAssignment(true)
    setAssignmentMessage('')
    setAssignmentError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/usuarios/${selectedMember.id}/puesto`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ puesto_id: selectedPositionId, monto: salaryAmount }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'No se pudo guardar la asignación')
      setAssignmentMessage(result.message)
      await loadEmployees()
      window.setTimeout(() => setSelectedMember(null), 700)
    } catch (error) {
      setAssignmentError(error.message)
    } finally {
      setIsSavingAssignment(false)
    }
  }

  const normalizedSearch = search.toLowerCase()

  const filteredProjects = useMemo(
    () =>
      localProjects
        .map((project) => ({
          ...project,
          assigned_employees: project.assigned_employees || [],
          status: project.status || 'En ejecución',
          color: project.color || 'green',
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

  const filteredMembers = useMemo(
    () =>
      teamMembers.filter((member) =>
        [member.name, member.role, member.puesto, member.rol]
          .some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      ),
    [teamMembers, normalizedSearch]
  )

  const filteredTeamMembers = useMemo(() => {
    const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase()
    const selectedTeam = localProjects.find((project) => String(project.id) === teamFilter)
    return filteredMembers.filter((member) => {
      const employeeMatches = !normalizedEmployeeSearch || [member.name, member.email, member.role, member.puesto]
        .some((value) => String(value || '').toLowerCase().includes(normalizedEmployeeSearch))
      const teamMembers = selectedTeam?.assigned_employees || []
      const teamMatches = !teamFilter || teamMembers.some((assignedMember) => {
        const assignedName = assignedMember?.name || assignedMember
        return String(assignedName || '').toLowerCase() === String(member.name || '').toLowerCase()
      })
      return employeeMatches && teamMatches
    })
  }, [employeeSearch, filteredMembers, localProjects, teamFilter])

  const filteredAttendanceReport = useMemo(() => attendanceReport.filter((record) => {
    const employeeMatches = !reportEmployee || record.empleado.toLowerCase().includes(reportEmployee.toLowerCase())
    const typeMatches = !reportType || record.tipo === reportType
    return employeeMatches && typeMatches
  }), [attendanceReport, reportEmployee, reportType])

  const attendancePageSize = 10
  const attendancePageCount = Math.max(1, Math.ceil(filteredAttendanceReport.length / attendancePageSize))
  const paginatedAttendanceReport = useMemo(() => {
    const start = (attendancePage - 1) * attendancePageSize
    return filteredAttendanceReport.slice(start, start + attendancePageSize)
  }, [attendancePage, filteredAttendanceReport])

  useEffect(() => {
    setAttendancePage(1)
  }, [reportEmployee, reportType, reportProjectId, reportFrom, reportTo])

  const filteredAbsenceReport = useMemo(() => absenceReport.filter((absence) => (
    !reportEmployee || absence.empleado.toLowerCase().includes(reportEmployee.toLowerCase())
  )), [absenceReport, reportEmployee])

  const exportReportToExcel = () => {
    const escapeHtml = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

    const attendanceHeaders = ['Fecha y hora', 'Empleado', 'Proyecto', 'Registro', 'Estado', 'Comprobante']
    const attendanceRows = filteredAttendanceReport.map((record) => `
      <tr>
        <td>${escapeHtml(new Date(record.fecha_hora).toLocaleString('es-ES'))}</td>
        <td>${escapeHtml(record.empleado || '')}</td>
        <td>${escapeHtml(record.proyecto || '')}</td>
        <td>${escapeHtml(record.tipo || '')}</td>
        <td>${escapeHtml(record.tipo === 'entrada' ? 'Entrada' : 'Salida')}</td>
        <td>${escapeHtml(record.foto_data ? 'Con comprobante' : 'Sin comprobante')}</td>
      </tr>
    `).join('')

    const absenceRows = filteredAbsenceReport.length > 0 ? `
      <tr>
        <td colspan="6" class="section-title">Inasistencias y justificaciones</td>
      </tr>
      <tr>
        <th>Empleado</th>
        <th>Periodo</th>
        <th>Tipo</th>
        <th>Proyecto</th>
        <th>Observaciones</th>
        <th>Estado</th>
        <th>Estado</th>
      </tr>
      ${filteredAbsenceReport.map((absence) => `
        <tr>
          <td>${escapeHtml(absence.empleado || '')}</td>
          <td>${escapeHtml(`${absence.fecha_inicio || ''} al ${absence.fecha_fin || ''}`)}</td>
          <td>${escapeHtml(absence.tipo ? absence.tipo.replaceAll('_', ' ') : '')}</td>
          <td>${escapeHtml(absence.proyecto || '')}</td>
          <td>${escapeHtml(absence.observaciones || 'Sin observaciones')}</td>
          <td>${escapeHtml(absence.estado || 'pendiente')}</td>
        </tr>
      `).join('')}
    ` : ''

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; color: #16313b; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th {
            background: #16313b;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 10px 8px;
            border: 1px solid #dfe8ec;
          }
          td {
            padding: 8px;
            border: 1px solid #dfe8ec;
            vertical-align: top;
            background: #ffffff;
          }
          tr:nth-child(even) td { background: #f8fbfd; }
          .sheet-title {
            font-size: 20px;
            font-weight: bold;
            background: #dff3f8;
            color: #16313b;
            padding: 14px 10px;
            border: 1px solid #dfe8ec;
          }
          .section-title {
            font-weight: bold;
            font-size: 14px;
            background: #eaf8f0;
            color: #0a5d49;
            padding: 10px 8px;
            border: 1px solid #dfe8ec;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="6" class="sheet-title">Reporte de asistencia y control</td>
          </tr>
          <tr>
            ${attendanceHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
          </tr>
          ${attendanceRows}
          ${absenceRows}
        </table>
      </body>
      </html>
    `

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const fileName = `reporte_${new Date().toISOString().slice(0, 10)}.xls`
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportMonthlyAttendance = async () => {
    setMonthlyExportLoading(true)
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      const toDateValue = (date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      const desde = toDateValue(monthStart)
      const hasta = toDateValue(monthEnd)
      const params = new URLSearchParams({ desde, hasta })
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/fichajes/reportes/asistencia?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'No se pudo exportar el mes')

      const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
      const monthName = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
      const rows = (result.registros || []).map((record) => `
        <tr>
          <td>${escapeHtml(new Date(record.fecha_hora).toLocaleString('es-ES'))}</td>
          <td>${escapeHtml(record.empleado || '')}</td>
          <td>${escapeHtml(record.proyecto || '')}</td>
          <td>${escapeHtml(record.tipo === 'entrada' ? 'Entrada' : 'Salida')}</td>
          <td>${escapeHtml(record.foto_data ? 'Con comprobante' : 'Sin comprobante')}</td>
        </tr>
      `).join('')
      const html = `
        <html><head><meta charset="UTF-8" /><style>
          body { font-family: Arial, sans-serif; color: #172d61; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th { background: #172d61; color: #fff; padding: 10px 8px; text-align: left; }
          td { border: 1px solid #d9e5f1; padding: 8px; }
          tr:nth-child(even) td { background: #f3f7fc; }
          .title { background: #dff3fb; font-size: 18px; font-weight: bold; padding: 12px 8px; }
        </style></head><body><table>
          <tr><td colspan="5" class="title">Asistencias de ${escapeHtml(monthName)}</td></tr>
          <tr><th>Fecha y hora</th><th>Empleado</th><th>Proyecto</th><th>Registro</th><th>Comprobante</th></tr>
          ${rows || '<tr><td colspan="5">No hay asistencias registradas este mes.</td></tr>'}
        </table></body></html>
      `
      const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `asistencias_${desde.slice(0, 7)}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setReportError(error.message)
    } finally {
      setMonthlyExportLoading(false)
    }
  }

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const leadingDays = (firstDay.getDay() + 6) % 7
    const recordsByDay = filteredAttendanceReport.reduce((groups, record) => {
      const date = new Date(record.fecha_hora)
      if (date.getFullYear() !== year || date.getMonth() !== month) return groups
      const day = date.getDate()
      groups[day] = groups[day] || { entrada: 0, salida: 0 }
      groups[day][record.tipo] += 1
      return groups
    }, {})
    const absencesByDay = absenceReport.reduce((groups, absence) => {
      const start = new Date(`${absence.fecha_inicio}T00:00:00`)
      const end = new Date(`${absence.fecha_fin}T00:00:00`)
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day)
        if (date >= start && date <= end) groups[day] = true
      }
      return groups
    }, {})

    return [
      ...Array.from({ length: leadingDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => ({
        day: index + 1,
        records: recordsByDay[index + 1] || { entrada: 0, salida: 0 },
        absence: Boolean(absencesByDay[index + 1]),
      })),
    ]
  }, [calendarMonth, filteredAbsenceReport, filteredAttendanceReport])

  const calendarTitle = calendarMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
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
      text: 'Analiza desempeño, cumplimiento y avance general con datos simulados listos para integrar.',
      badge: 'Reportes',
    },
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img className="admin-brand-mark" src={systemLogo} alt="Gestión Empleados" />
          <div>
            <h2>Gestión Empleados</h2>
            <p>Panel administrativo</p>
          </div>
        </div>

        <nav className="admin-nav">
          {['Inicio', 'Proyectos', 'Equipo', 'Reportes'].map((item) => (
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
              placeholder="Buscar proyecto, tarea o colaborador"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="admin-topbar-actions">
            <div className="settings-menu-wrapper">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label={`Notificaciones${pendingNotifications.length ? ` (${pendingNotifications.length} pendientes)` : ''}`}
                onClick={() => {
                  setShowNotifications((prev) => !prev)
                  setShowSettingsMenu(false)
                }}
              >
                <FaBell />
                {pendingNotifications.length > 0 && <span className="notification-count">{pendingNotifications.length > 9 ? '9+' : pendingNotifications.length}</span>}
              </button>
              {showNotifications && (
                <div className="notification-menu">
                  <div className="notification-header">
                    <span>Solicitudes pendientes</span>
                    {pendingNotifications.length > 0 && <strong>{pendingNotifications.length}</strong>}
                  </div>
                  {pendingNotifications.length > 0 ? pendingNotifications.map((absence) => (
                    <button
                      type="button"
                      className="notification-item"
                      key={absence.id}
                      onClick={async () => {
                        setActiveSection('Reportes')
                        setReportFrom(normalizarFechaInput(absence.fecha_inicio))
                        setReportTo(normalizarFechaInput(absence.fecha_fin))
                        setReportEmployee(absence.empleado || '')
                        setShowNotifications(false)

                        try {
                          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ausencias/${absence.id}/leida`, {
                            method: 'PATCH',
                            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
                          })
                          if (!response.ok) throw new Error('No se pudo marcar la notificación como leída')
                          setPendingNotifications((current) => current.filter((item) => item.id !== absence.id))
                        } catch (error) {
                          console.error(error)
                        }
                      }}
                    >
                      <strong>{absence.empleado || 'Empleado'}</strong>
                      <span>Solicita justificar su inasistencia</span>
                      <small>{normalizarFechaInput(absence.fecha_inicio)}{normalizarFechaInput(absence.fecha_fin) !== normalizarFechaInput(absence.fecha_inicio) ? ` al ${normalizarFechaInput(absence.fecha_fin)}` : ''}</small>
                    </button>
                  )) : (
                    <div className="notification-empty">No hay solicitudes pendientes.</div>
                  )}
                  <button type="button" className="notification-small-btn" onClick={() => setShowNotifications(false)}>Cerrar</button>
                </div>
              )}
            </div>
            <div className="settings-menu-wrapper">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Configuración"
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
            {activeSection !== 'Reportes' && (
              <button type="button" className="admin-primary-btn" onClick={() => setShowNew(true)}>
                <FaPlus />
                <span>Nuevo proyecto</span>
              </button>
            )}
          </div>
        </header>

        <section className="admin-hero">
          <div>
            <p className="eyebrow">{heroCopy[activeSection].badge}</p>
            <h1>{heroCopy[activeSection].title}</h1>
            <p className="admin-hero-text">{heroCopy[activeSection].text}</p>
          </div>
        </section>

        {activeSection === 'Reportes' && (
          <section className="admin-panel attendance-report-panel">
            <div className="admin-panel-header">
              <div>
                <p className="eyebrow">Control de asistencia</p>
                <h2>Asistencias por proyecto</h2>
              </div>
              <span className="project-count">{filteredAttendanceReport.length} registros</span>
            </div>

            <div className="report-filters">
              <label>
                Proyecto
                <select value={reportProjectId} onChange={(event) => setReportProjectId(event.target.value)}>
                  <option value="">Todos los proyectos</option>
                  {localProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>
                Desde
                <input type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
              </label>
              <label>
                Empleado
                <input type="search" placeholder="Buscar empleado" value={reportEmployee} onChange={(event) => setReportEmployee(event.target.value)} />
              </label>
              <label>
                Tipo
                <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
                  <option value="">Entradas y salidas</option>
                  <option value="entrada">Solo entradas</option>
                  <option value="salida">Solo salidas</option>
                </select>
              </label>
              <div className="report-actions">
                <button type="button" className="btn-secondary report-clear-btn" onClick={() => {
                  setReportProjectId('')
                  setReportFrom(obtenerFechaActual())
                  setReportTo(obtenerFechaActual())
                  setReportEmployee('')
                  setReportType('')
                }}>
                  Limpiar filtros
                </button>
                <button type="button" className="btn-primary report-export-btn" onClick={exportReportToExcel} disabled={reportLoading || (!filteredAttendanceReport.length && !filteredAbsenceReport.length)}>
                  Exportar Excel
                </button>
                <button type="button" className="btn-primary report-export-btn report-month-export-btn" onClick={exportMonthlyAttendance} disabled={reportLoading || monthlyExportLoading}>
                  {monthlyExportLoading ? 'Preparando mes...' : 'Exportar mes'}
                </button>
              </div>
            </div>

            <div className="report-summary">
              <div><strong>{filteredAttendanceReport.filter((record) => record.tipo === 'entrada').length}</strong><span>Entradas</span></div>
              <div><strong>{filteredAttendanceReport.filter((record) => record.tipo === 'salida').length}</strong><span>Salidas</span></div>
              <div><strong>{new Set(filteredAttendanceReport.map((record) => record.usuario_id)).size}</strong><span>Empleados</span></div>
            </div>

            <div className="attendance-calendar">
              <div className="attendance-calendar-header">
                <div>
                  <p className="eyebrow">Almanaque</p>
                  <h3>{calendarTitle.charAt(0).toUpperCase() + calendarTitle.slice(1)}</h3>
                </div>
                <div className="calendar-nav" aria-label="Navegar por meses">
                  <button type="button" aria-label="Mes anterior" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><FaChevronLeft /></button>
                  <button type="button" aria-label="Mes siguiente" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><FaChevronRight /></button>
                </div>
              </div>
              <div className="calendar-weekdays">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid">
                {calendarDays.map((item, index) => item ? (
                  <div className="calendar-day" key={item.day}>
                    <strong>{item.day}</strong>
                    {(item.absence || item.records.entrada > 0 || item.records.salida > 0) && (
                      <div className="calendar-records">
                        {item.absence && <span className="calendar-entry ausencia">Ausencia</span>}
                        {item.records.entrada > 0 && <span className="calendar-entry entrada">{item.records.entrada} entrada{item.records.entrada !== 1 ? 's' : ''}</span>}
                        {item.records.salida > 0 && <span className="calendar-entry salida">{item.records.salida} salida{item.records.salida !== 1 ? 's' : ''}</span>}
                      </div>
                    )}
                  </div>
                ) : <div className="calendar-day empty" key={`empty-${index}`} aria-hidden="true" />)}
              </div>
            </div>

            {reportLoading && <p className="admin-empty-state">Cargando asistencias...</p>}
            {reportError && <p className="assignment-error">{reportError}</p>}
            {!reportLoading && !reportError && filteredAttendanceReport.length > 0 && (
              <div className="attendance-table-wrapper">
                <table className="attendance-table">
                  <thead><tr><th>Fecha y hora</th><th>Empleado</th><th>Proyecto</th><th>Registro</th><th>Comprobante</th></tr></thead>
                  <tbody>
                    {paginatedAttendanceReport.map((record) => (
                      <tr key={record.id}>
                        <td>{new Date(record.fecha_hora).toLocaleString('es-ES')}</td>
                        <td>{record.empleado}</td>
                        <td>{record.proyecto}</td>
                        <td><span className={`attendance-type ${record.tipo}`}>{record.tipo}</span></td>
                        <td>
                          <button type="button" className="report-photo-btn" disabled={!record.foto_data} onClick={() => setSelectedAttendance(record)}>
                            <FaCamera />
                            {record.foto_data ? 'Ver foto' : 'Sin foto'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {attendancePageCount > 1 && (
                  <div className="attendance-pagination" aria-label="Paginación de asistencias">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={attendancePage === 1}
                      onClick={() => setAttendancePage((page) => page - 1)}
                    >
                      Anterior
                    </button>
                    <span>Página {attendancePage} de {attendancePageCount}</span>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={attendancePage === attendancePageCount}
                      onClick={() => setAttendancePage((page) => page + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
            {!reportLoading && !reportError && filteredAttendanceReport.length === 0 && (
              <p className="admin-empty-state">No hay asistencias para los filtros seleccionados.</p>
            )}

            {!reportLoading && !reportError && (
              <div className="absence-report">
                <div className="admin-panel-header">
                  <div>
                    <p className="eyebrow">Seguimiento</p>
                    <h2>Inasistencias y justificaciones</h2>
                  </div>
                  <span className="project-count">{filteredAbsenceReport.length} registros</span>
                </div>
                {filteredAbsenceReport.length > 0 ? (
                  <div className="attendance-table-wrapper">
                    <table className="attendance-table">
                      <thead><tr><th>Empleado</th><th>Periodo</th><th>Tipo</th><th>Proyecto</th><th>Observaciones</th><th>Estado</th><th>Acciones</th></tr></thead>
                      <tbody>
                        {filteredAbsenceReport.map((absence) => (
                          <tr key={absence.id}>
                            <td>{absence.empleado}</td>
                            <td>{absence.fecha_inicio} al {absence.fecha_fin}</td>
                            <td><span className="absence-type">{absence.tipo.replaceAll('_', ' ')}</span></td>
                            <td>{absence.proyecto}</td>
                            <td>{absence.observaciones || 'Sin observaciones'}</td>
                            <td><span className={`absence-status ${absence.estado || 'pendiente'}`}>{absence.estado || 'pendiente'}</span></td>
                            <td>
                              {absence.estado === 'pendiente' ? (
                                <div className="absence-review-actions">
                                  <button
                                    type="button"
                                    className="absence-review-btn accept"
                                    disabled={reviewingAbsenceId === absence.id}
                                    onClick={() => reviewAbsence(absence.id, 'aceptada')}
                                  >
                                    Aceptar
                                  </button>
                                  <button
                                    type="button"
                                    className="absence-review-btn reject"
                                    disabled={reviewingAbsenceId === absence.id}
                                    onClick={() => reviewAbsence(absence.id, 'rechazada')}
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              ) : (
                                <span className="absence-reviewed-label">Revisada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="admin-empty-state">No hay inasistencias registradas para los filtros seleccionados.</p>}
              </div>
            )}
          </section>
        )}

        {activeSection !== 'Reportes' && activeSection !== 'Equipo' && (
          <section className="admin-grid admin-grid-2 admin-projects-section">
              <div className="admin-panel admin-projects-panel">
                <div className="admin-panel-header">
                  <div>
                    <p className="eyebrow">Proyectos</p>
                    <h2>Proyectos guardados</h2>
                  </div>
                  <span className="project-count">{filteredProjects.length} {filteredProjects.length === 1 ? 'proyecto' : 'proyectos'}</span>
                </div>

                <div className="admin-project-list">
                  {filteredProjects.map((project) => (
                    <button
                      type="button"
                      className="admin-project-item admin-project-card"
                      key={project.id || project.name}
                      onClick={() => setSelectedProject(project)}
                      aria-label={`Ver detalles de ${project.name}`}
                    >
                      <div className="project-card-content">
                        <div className="project-card-topline">
                          <span className="project-card-label">Obra activa</span>
                          <span className="project-status">{project.status}</span>
                        </div>
                        <h3>{project.name}</h3>
                        <div className="project-card-meta">
                          <span>Equipo {project.assigned_employees.length}</span>
                          <span>{project.jornada || 'Jornada no definida'}</span>
                        </div>
                      </div>
                      <span className={`project-dot ${project.color}`} aria-hidden="true" />
                    </button>
                  ))}
                  {filteredProjects.length === 0 && (
                    <p className="admin-empty-state">
                      {localProjects.length === 0 ? 'Todavía no hay proyectos guardados.' : 'No hay proyectos que coincidan con la búsqueda.'}
                    </p>
                  )}
                </div>
              </div>
          </section>
        )}

        {activeSection !== 'Proyectos' && activeSection !== 'Reportes' && (
          <section className="admin-panel admin-team-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="eyebrow">Equipo</p>
                  <h2>Colaboradores destacados</h2>
                </div>
                <span className="project-count">{filteredTeamMembers.length} colaboradores</span>
              </div>

              <div className="team-filters">
                <label>
                  Buscar empleado
                  <input
                    type="search"
                    placeholder="Nombre, correo o puesto"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                  />
                </label>
                <label>
                  Equipo
                  <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                    <option value="">Todos los equipos</option>
                    {localProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </label>
                {(employeeSearch || teamFilter) && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setEmployeeSearch('')
                    setTeamFilter('')
                  }}>
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="admin-team-list">
                {filteredTeamMembers.map((member) => (
                  <div className="admin-team-item" key={member.id || member.name}>
                    <div className="admin-avatar">{String(member.name || 'E').charAt(0).toUpperCase()}</div>
                    <div>
                      <h3>{member.name || 'Empleado sin nombre'}</h3>
                      <p>{member.puesto || 'Sin puesto asignado'}</p>
                    </div>
                    <button type="button" className="admin-assign-btn" onClick={() => openAssignment(member)}>
                      <FaBriefcase />
                      <span>{member.puesto ? 'Editar puesto' : 'Asignar puesto'}</span>
                    </button>
                  </div>
                ))}
                {filteredTeamMembers.length === 0 && <p className="admin-empty-state">No hay empleados que coincidan con los filtros.</p>}
              </div>
          </section>
        )}
      </main>
      {showNew && (
        <NuevoProyecto
          teamMembers={teamMembers}
          onClose={() => setShowNew(false)}
          onSaved={() => {
            loadProjects()
          }}
        />
      )}
      {editingProject && (
        <NuevoProyecto
          project={editingProject}
          teamMembers={teamMembers}
          onClose={() => setEditingProject(null)}
          onSaved={(updatedProject) => {
            setLocalProjects((projects) => projects.map((project) => (
              project.id === updatedProject.id ? { ...project, ...updatedProject } : project
            )))
          }}
        />
      )}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <article className="modal-card assignment-card" onClick={(event) => event.stopPropagation()}>
            <header className="modal-card-header">
              <div>
                <p className="eyebrow">Gestión de equipo</p>
                <h3>Asignar puesto a {selectedMember.name}</h3>
                <p className="modal-card-subtitle">La liquidación se toma automáticamente del puesto seleccionado.</p>
              </div>
              <button type="button" onClick={() => setSelectedMember(null)} className="btn-secondary btn-close">Cerrar</button>
            </header>

            <form className="assignment-form" onSubmit={saveAssignment}>
              <label htmlFor="employee-position">Puesto de trabajo</label>
              <select
                id="employee-position"
                value={selectedPositionId}
                onChange={(event) => setSelectedPositionId(event.target.value)}
                required
              >
                <option value="">Selecciona un puesto</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.nombre} - {position.tipo_liquidacion.replace('_', ' ')}
                  </option>
                ))}
              </select>

              <label htmlFor="employee-salary">Liquidación correspondiente</label>
              <input
                id="employee-salary"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Ej. 850.00"
                value={salaryAmount}
                onChange={(event) => setSalaryAmount(event.target.value)}
                required
              />

              {selectedPositionId && (
                <div className="assignment-preview">
                  <span>Periodicidad</span>
                  <strong>{positions.find((position) => String(position.id) === selectedPositionId)?.tipo_liquidacion.replace('_', ' ')}</strong>
                </div>
              )}
              {positions.length === 0 && <p className="assignment-error">No hay puestos activos configurados.</p>}
              {assignmentMessage && <p className="save-message">{assignmentMessage}</p>}
              {assignmentError && <p className="assignment-error">{assignmentError}</p>}

              <div className="button-row">
                <button type="button" className="btn-secondary btn-close" onClick={() => setSelectedMember(null)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSavingAssignment || positions.length === 0}>
                  {isSavingAssignment ? 'Guardando...' : 'Guardar asignación'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <article className="modal-card project-detail-card" onClick={(event) => event.stopPropagation()}>
            <header className="modal-card-header">
              <div>
                <p className="eyebrow">Detalle del proyecto</p>
                <h3>{selectedProject.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedProject(null)} className="btn-secondary btn-close">
                Cerrar
              </button>
            </header>

            <button type="button" className="admin-edit-project-btn" onClick={() => {
              setEditingProject(selectedProject)
              setSelectedProject(null)
            }}>
              Editar proyecto
            </button>

            <div className="project-detail-grid">
              <div><span>Estado</span><strong>{selectedProject.status}</strong></div>
              <div><span>Jornada</span><strong>{selectedProject.jornada || 'No especificada'}</strong></div>
              <div><span>Radio de control</span><strong>{selectedProject.radius_m || 50} m</strong></div>
              <div><span>Creado</span><strong>{selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString('es-ES') : 'No disponible'}</strong></div>
            </div>

            <div className="project-detail-section">
              <h4>Empleados asignados</h4>
              {selectedProject.assigned_employees.length > 0 ? (
                <p>{selectedProject.assigned_employees.join(', ')}</p>
              ) : (
                <p>No hay empleados asignados.</p>
              )}
            </div>
            <div className="project-detail-section">
              <h4>Ubicación</h4>
              <p>
                {Number.isFinite(Number(selectedProject.lat)) && Number.isFinite(Number(selectedProject.lng))
                  ? `${Number(selectedProject.lat).toFixed(6)}, ${Number(selectedProject.lng).toFixed(6)}`
                  : 'No especificada'}
              </p>
            </div>
          </article>
        </div>
      )}
      {selectedAttendance && (
        <div className="modal-overlay" onClick={() => setSelectedAttendance(null)}>
          <article className="modal-card attendance-photo-card" onClick={(event) => event.stopPropagation()}>
            <header className="modal-card-header">
              <div>
                <p className="eyebrow">Comprobante de asistencia</p>
                <h3>{selectedAttendance.empleado}</h3>
                <p className="modal-card-subtitle">{selectedAttendance.proyecto} · {new Date(selectedAttendance.fecha_hora).toLocaleString('es-ES')}</p>
              </div>
              <button type="button" onClick={() => setSelectedAttendance(null)} className="btn-secondary btn-close">Cerrar</button>
            </header>
            <img src={selectedAttendance.foto_data} alt={`Selfie de ${selectedAttendance.empleado}`} className="attendance-photo-preview" />
            <div className="attendance-photo-footer">
              <span className={`attendance-type ${selectedAttendance.tipo}`}>{selectedAttendance.tipo}</span>
              <span>Ubicación registrada: {Number(selectedAttendance.latitud).toFixed(5)}, {Number(selectedAttendance.longitud).toFixed(5)}</span>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

export default AdminPage
