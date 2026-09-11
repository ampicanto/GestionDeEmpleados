import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage.jsx'
import Landingpage from './pages/Landingpage.jsx'
import Empleado from './pages/Empleado.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import Recuperacion from './pages/Recuperacion.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { ToastProvider } from './components/Toast.jsx'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/empleado"
          element={
            <ProtectedRoute allowedRoles={[3]}>
              <Empleado />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperacion" element={<Recuperacion />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
