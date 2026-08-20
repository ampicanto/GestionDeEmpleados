import { Navigate, useLocation } from 'react-router-dom'

const ROLE_REDIRECTS = {
  1: '/admin',
  2: '/admin',
  3: '/empleado',
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser') || 'null')
  } catch {
    return null
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation()
  const token = localStorage.getItem('authToken')
  const user = getStoredUser()
  const roleId = Number(user?.rol_id)

  if (!token || !user || !ROLE_REDIRECTS[roleId]) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!allowedRoles.includes(roleId)) {
    return <Navigate to={ROLE_REDIRECTS[roleId]} replace />
  }

  return children
}

export default ProtectedRoute