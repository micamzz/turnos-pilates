import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* una sola verificación compartida para toda la app. */
function ProtectedRoute({ children }) {
  const { sesion, verificando } = useAuth()

  if (verificando) {
    return <p style={{ textAlign: 'center', marginTop: '40px' }}>Cargando...</p>
  }

  if (!sesion) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
