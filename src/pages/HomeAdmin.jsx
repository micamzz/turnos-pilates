import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomeAdmin.css'
import { Layout } from '../components/layout/Layout.jsx'

function HomeAdmin() {
  const navegar = useNavigate()
  const [fecha, setFecha] = useState('')

  useEffect(() => {
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
    const hoy = new Date()
    setFecha(`${dias[hoy.getDay()]}, ${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`)
  }, [])

  return (
        <Layout>
    <div className="contenedor-home-admin">
      <div className="bienvenida">
        <h1>Bienvenida al panel de administración</h1>
        <p className="fecha">{fecha}</p>
        <p className="subtitulo">Desde acá podés gestionar clientes, turnos y horarios del estudio.</p>
      </div>

      <div className="grid-acciones">
        <div className="card-accion" onClick={() => navegar('/agregar-cliente')}>
          <div>
            <h2>Agregar cliente</h2>
            <p>Registrá un nuevo cliente con sus datos y plan asignado.</p>
          </div>
        </div>

        <div className="card-accion" onClick={() => navegar('/agendar-turno')}>
          <div>
            <h2>Reprogramar turno</h2>
            <p>Asigná un turno a un cliente en el horario disponible.</p>
          </div>
        </div>

        <div className="card-accion" onClick={() => navegar('/cancelar-turno')}>
          <div>
            <h2>Cancelar turno</h2>
            <p>Cancelá un turno existente de forma rápida.</p>
          </div>
        </div>

        <div className="card-accion" onClick={() => navegar('/horarios-dia')}>
          <div>
            <h2>Horarios del día</h2>
            <p>Consultá los turnos y clases programadas para hoy.</p>
          </div>
        </div>
      </div>
    </div>
    </Layout>
  )
}

export default HomeAdmin