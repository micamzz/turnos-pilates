import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login.jsx'
import Clientes from './pages/Clientes.jsx'
import AgregarCliente from './pages/AgregarCliente.jsx'
import HomeAdmin from './pages/HomeAdmin.jsx'
import Agenda from './pages/Agenda.jsx'
import DetalleClase from './pages/DetalleClase.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider envuelve toda la app: getSession() se llama UNA sola vez */}
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/clientes"
            element={
              <ProtectedRoute>
                <Clientes />
              </ProtectedRoute>
            }
          />

          <Route path="/agregar-cliente"
            element={
              <ProtectedRoute>
                <AgregarCliente />
              </ProtectedRoute>
            }
          />

          <Route path="/home"
            element={
              <ProtectedRoute>
                <HomeAdmin />
              </ProtectedRoute>
            }
          />

          <Route path="/agenda"
            element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            }
          />

          <Route path="/agenda/:claseId/:fecha"
            element={
              <ProtectedRoute>
                <DetalleClase />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
