import '../App.css'
import { FaRegUser, FaSignInAlt, FaHardHat, FaTools, FaLeaf } from 'react-icons/fa'

const stats = [
  { value: '25+', label: 'años de experiencia' },
  { value: '120+', label: 'obras ejecutadas' },
  { value: '98%', label: 'cumplimiento operativo' },
]

const services = [
  {
    icon: <FaHardHat />,
    title: 'Obras civiles',
    description: 'Plataformas, accesos, estructuras y desarrollos que soportan la operación industrial.',
  },
  {
    icon: <FaTools />,
    title: 'Ingeniería industrial',
    description: 'Diseño y optimización de procesos para elevar la eficiencia y reducir tiempos de parada.',
  },
  {
    icon: <FaLeaf />,
    title: 'Sostenibilidad',
    description: 'Soluciones pensadas para una producción más limpia, segura y rentable.',
  },
]

const process = [
  { step: '01', title: 'Diagnóstico', description: 'Analizamos la operación, los retos del terreno y la capacidad instalada.' },
  { step: '02', title: 'Diseño', description: 'Planeamos cada intervención con ingeniería precisa y enfoque industrial.' },
  { step: '03', title: 'Ejecución', description: 'Coordinamos obra, seguridad y tiempos para entregar con calidad.' },
  { step: '04', title: 'Mantenimiento', description: 'Acompañamos la vida útil del activo con soporte continuo y mejora.' },
]

function Landingpage() {
  return (
    <div className="landing-page">
      <header className="hero-section">
        <div className="hero-content">
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
          <div className="hero-badge">Ingenio • Construcción • Ingeniería</div>
          <h1>Construimos la base de una industria más fuerte.</h1>
          <p className="hero-text">
            Creamos infraestructura confiable para ingenios y plantas agroindustriales, con obra civil,
            ingeniería y ejecución orientada a resultados reales.
          </p>
          <div className="hero-actions">
            <a href="#proyectos" className="btn btn-primary">
              Ver proyectos
            </a>
            <a href="#contacto" className="btn btn-secondary">
              Cotizar obra
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

        <aside className="hero-card">
          <div className="hero-card-topline">Por qué nos eligen</div>
          <h2>Soluciones que combinan tradición, tecnología y rigor operativo.</h2>
          <ul>
            <li>Planificación integral de obra</li>
            <li>Equipo especializado en entornos industriales</li>
            <li>Enfoque en seguridad, continuidad y rentabilidad</li>
          </ul>
        </aside>
      </header>

      <main>
        <section className="section" id="servicios">
          <div className="section-heading">
            <p className="eyebrow">Servicios</p>
            <h2>Infraestructura sólida para operar con confianza.</h2>
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
            <p className="eyebrow">Nuestro enfoque</p>
            <h2>Una obra pensada para el ritmo del ingenio.</h2>
            <p className="section-text">
              Entendemos que cada proyecto afecta la productividad, la seguridad y la continuidad del negocio.
              Por eso trabajamos con metodología clara, trazabilidad y visión de largo plazo.
            </p>
          </div>

          <div className="highlight-panel">
            <h3>Destacamos en</h3>
            <ul>
              <li>Diseño de infraestructura para procesos industriales</li>
              <li>Mejoras en eficiencia operativa</li>
              <li>Intervenciones con mínima afectación a la producción</li>
            </ul>
          </div>
        </section>

        <section className="section" id="proceso">
          <div className="section-heading">
            <p className="eyebrow">Proceso</p>
            <h2>De la idea a la operación, con criterio y disciplina.</h2>
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
          <h2>Impulsamos proyectos que dejan huella en la industria.</h2>
          <p>Hablemos sobre tu próximo reto de construcción o ingeniería industrial.</p>
          <a href="mailto:contacto@ingenio-constructora.com" className="btn btn-primary">
            Escríbenos
          </a>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Ingenio Constructora</h3>
            <p>Infraestructura, ingeniería y ejecución para una industria más sólida.</p>
            <span className="footer-badge">Ingenio • Construcción • Ingeniería</span>
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
