import { useEffect, useState } from 'react'
import '../App.css'
import { FaRegUser, FaSignInAlt, FaHardHat, FaTools, FaLeaf, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import systemLogo from '../assets/images.png'

const stats = [
  { value: '120+', label: 'empleados registrados' },
  { value: '98%', label: 'asistencias controladas' },
  { value: '24/7', label: 'información disponible' },
]

const services = [
  {
    icon: <FaHardHat />,
    title: 'Control de asistencia',
    description: 'Registra entradas y salidas con ubicación, hora y evidencia fotográfica en un solo lugar.',
  },
  {
    icon: <FaTools />,
    title: 'Gestión de equipos',
    description: 'Organiza colaboradores, proyectos y jornadas con una vista clara para cada responsable.',
  },
  {
    icon: <FaLeaf />,
    title: 'Reportes operativos',
    description: 'Consulta indicadores y novedades para tomar decisiones rápidas con información confiable.',
  },
]

const process = [
  { step: '01', title: 'Registra', description: 'Cada colaborador marca su jornada de forma rápida y segura.' },
  { step: '02', title: 'Organiza', description: 'Asigna personas y proyectos desde un panel centralizado.' },
  { step: '03', title: 'Supervisa', description: 'Revisa incidencias, ubicaciones y solicitudes en tiempo real.' },
  { step: '04', title: 'Decide', description: 'Convierte los registros diarios en acciones claras para tu equipo.' },
]

const showcaseSlides = [
  {
    tag: 'Equipo conectado',
    title: 'Toda tu operación en una sola vista',
    description: 'Personas, proyectos y jornadas organizados para trabajar mejor.',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80',
  },
  {
    tag: 'Seguimiento simple',
    title: 'Información clara para cada decisión',
    description: 'Consulta el estado de tu equipo sin depender de hojas de cálculo.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80',
  },
  {
    tag: 'Gestión diaria',
    title: 'Una jornada más ordenada y eficiente',
    description: 'Automatiza el seguimiento y dedica más tiempo a las personas.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
  },
]

function Landingpage() {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % showcaseSlides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [])

  const activeSlideData = showcaseSlides[activeSlide]

  const changeSlide = (direction) => {
    if (direction === 'next') {
      setActiveSlide((prev) => (prev + 1) % showcaseSlides.length)
      return
    }

    setActiveSlide((prev) => (prev - 1 + showcaseSlides.length) % showcaseSlides.length)
  }

  return (
    <div className="landing-page">
      <header className="hero-section">
        <div className="hero-content">
          <div className="landing-brand">
            <img src={systemLogo} alt="Gestión Empleados" />
            <span>Gestión Empleados</span>
          </div>
          <div className="topbar-actions">
            <a href="/registro" className="topbar-btn topbar-btn-outline">
              <FaRegUser />
              <span>Registro</span>
            </a>
            <a href="/login" className="topbar-btn topbar-btn-solid">
              <FaSignInAlt />
              <span>Iniciar sesión</span>
            </a>
          </div>
          <div className="hero-badge">Personas • Asistencia • Organización</div>
          <h1>El pulso de tu equipo, siempre bajo control.</h1>
          <p className="hero-text">
            Gestión Empleados reúne asistencia, proyectos y seguimiento del personal en una plataforma
            clara para que tu empresa avance con información real.
          </p>
          <div className="hero-actions">
            <a href="#proyectos" className="btn btn-primary">
              Conocer la plataforma
            </a>
            <a href="/login" className="btn btn-secondary">
              Acceder al sistema
            </a>
          </div>

          <div className="stats-grid">
            {stats.map((item) => (
              <div className="stat-card" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-stack">
          <aside className="hero-card">
            <div className="hero-card-topline">Todo en un mismo lugar</div>
            <h2>Una gestión más simple para equipos que necesitan avanzar.</h2>
            <ul>
              <li>Asistencia con ubicación y selfie</li>
              <li>Proyectos y colaboradores organizados</li>
              <li>Reportes listos para tomar decisiones</li>
            </ul>
          </aside>

          <div className="hero-visual" aria-label="Galería de equipos de trabajo">
            <div
              className="hero-visual-image"
              style={{ backgroundImage: `url(${activeSlideData.image})` }}
            />
            <div className="hero-visual-overlay">
              <span className="hero-visual-badge">{activeSlideData.tag}</span>
              <h3>{activeSlideData.title}</h3>
              <p>{activeSlideData.description}</p>
            </div>
            <div className="carousel-controls">
              <button type="button" className="carousel-btn" onClick={() => changeSlide('prev')}>
                <FaChevronLeft />
              </button>
              <div className="carousel-dots">
                {showcaseSlides.map((slide, index) => (
                  <button
                    key={slide.tag}
                    type="button"
                    className={`carousel-dot ${index === activeSlide ? 'active' : ''}`}
                    onClick={() => setActiveSlide(index)}
                  />
                ))}
              </div>
              <button type="button" className="carousel-btn" onClick={() => changeSlide('next')}>
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="servicios">
          <div className="section-heading">
            <p className="eyebrow">Herramientas del sistema</p>
            <h2>Todo lo que tu equipo necesita para trabajar coordinado.</h2>
          </div>
          <div className="services-grid">
            {services.map((service) => (
              <article className="service-card" key={service.title}>
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split-section" id="proyectos">
          <div>
            <p className="eyebrow">Una nueva forma de organizarte</p>
            <h2>Menos tareas manuales. Más claridad para tu equipo.</h2>
            <p className="section-text">
              Centraliza la información de tus colaboradores y consulta cada jornada desde un entorno
              confiable, accesible y pensado para el trabajo diario.
            </p>
          </div>

          <div className="highlight-panel">
            <h3>La información que importa</h3>
            <ul>
              <li>Asistencias y ausencias en tiempo real</li>
              <li>Proyectos, jornadas y responsables</li>
              <li>Acceso seguro para cada perfil</li>
            </ul>
          </div>
        </section>

        <section className="section" id="proceso">
          <div className="section-heading">
            <p className="eyebrow">Cómo funciona</p>
            <h2>Del registro diario a una mejor operación.</h2>
          </div>
          <div className="process-grid">
            {process.map((item) => (
              <article className="process-card" key={item.step}>
                <span className="process-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-section" id="contacto">
          <h2>Haz que la gestión de tu equipo sea más sencilla.</h2>
          <p>Entra a la plataforma y empieza a trabajar con información más clara.</p>
          <a href="/registro" className="btn btn-primary">
            Crear una cuenta
          </a>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Gestión Empleados</h3>
            <p>Control de asistencia y gestión de equipos para empresas que avanzan.</p>
            <span className="footer-badge">Personas • Asistencia • Organización</span>
          </div>
          <div className="footer-section">
            <h4>Dueños del sistema</h4>
            <ul className="footer-list">
              <li>Corbalan Ricardo</li>
              <li>Juan Morales</li>
              <li>Canto Amparo</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contacto</h4>
            <ul className="footer-list">
              <li>contacto@ingenio-constructora.com</li>
              <li>+503 2222-3333</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landingpage
