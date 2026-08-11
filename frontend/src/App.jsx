import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage.jsx'
import Landingpage from './pages/Landingpage.jsx'
import Empleado from './pages/Empleado.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Recuperacion from './pages/Recuperacion.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/empleado" element={<Empleado />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperacion" element={<Recuperacion />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
