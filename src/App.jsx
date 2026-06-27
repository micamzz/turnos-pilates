import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Clientes from './pages/Clientes.jsx'
import AgregarCliente from './pages/AgregarCliente.jsx'
import HomeAdmin from './pages/HomeAdmin.jsx'
import Agenda from './pages/Agenda.jsx'
import DetalleClase from './pages/DetalleClase.jsx'



function App() {
  return (
    // BorwserRouter envuelve a toda la app y habilita el sistema de rutas. Routes contiene todas las rutas de la app 
    // y Route define cada ruta individualmente.
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/clientes" element={<Clientes />} />
         <Route path="/agregar-cliente" element={<AgregarCliente />} />
         <Route path="/home" element={<HomeAdmin />} />
         <Route path="/agenda" element={<Agenda />} />
         <Route path="/agenda/:claseId/:fecha" element={<DetalleClase />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App