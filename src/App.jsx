import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Clientes from './pages/Clientes'

function App() {
  return (
    // BorwserRouter envuelve a toda la app y habilita el sistema de rutas. Routes contiene todas las rutas de la app 
    // y Route define cada ruta individualmente.
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/clientes" element={<Clientes />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App