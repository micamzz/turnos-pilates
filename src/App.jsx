import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Clientes from './pages/Clientes'
import AgregarCliente from './pages/AgregarCliente'
import HomeAdmin from './pages/HomeAdmin'
import Agenda from './pages/Agenda'


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
      </Routes>
    </BrowserRouter>
  )
}

export default App