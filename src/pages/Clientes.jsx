import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerClientesConInscripciones, darDeBajaCliente } from '../services/clientes'
import { obtenerClases } from '../services/clase'
import { reprogramarInscripcion } from '../services/inscripcion'
import { Layout } from '../components/layout/Layout.jsx'
import './Clientes.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [clases, setClases] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  // AGREGADO: estado del modal de reprogramación
  const [modalReprogramar, setModalReprogramar] = useState(null) // { clienteId, inscripcion } o null
  const [nuevaClaseId, setNuevaClaseId] = useState('')

  const navegar = useNavigate()

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [listaClientes, listaClases] = await Promise.all([
        obtenerClientesConInscripciones(),
        obtenerClases(),
      ])
      setClientes(listaClientes)
      setClases(listaClases)
    } catch (err) {
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  // AGREGADO: filtra por nombre, sin importar mayúsculas/minúsculas
  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  async function manejarDarDeBaja(cliente) {
    const confirmado = window.confirm(`¿Dar de baja a ${cliente.nombre}?`)
    if (!confirmado) return

    try {
      await darDeBajaCliente(cliente.id)
      await cargarDatos() // refresca la tabla
    } catch (err) {
      setError('No se pudo dar de baja: ' + err.message)
    }
  }

  function abrirModalReprogramar(clienteId, inscripcion) {
    setModalReprogramar({ clienteId, inscripcion })
    setNuevaClaseId('')
  }

  function cerrarModal() {
    setModalReprogramar(null)
    setNuevaClaseId('')
  }

  async function confirmarReprogramacion() {
    if (!nuevaClaseId) {
      setError('Seleccioná la nueva clase')
      return
    }

    try {
      await reprogramarInscripcion(
        modalReprogramar.inscripcion.id,
        modalReprogramar.clienteId,
        nuevaClaseId
      )
      cerrarModal()
      await cargarDatos()
    } catch (err) {
      setError('No se pudo reprogramar: ' + err.message)
    }
  }

  return (
    <Layout>
      <div className="contenedor-clientes">
        <div className="encabezado-clientes">
          <h1>Clientes</h1>
          <button onClick={() => navegar('/agregar-cliente')}>+ Agregar Cliente</button>
        </div>

        {/* AGREGADO: buscador por nombre */}
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="buscador-clientes"
        />

        {cargando && <p>Cargando clientes...</p>}
        {error && <p className="mensaje-error">{error}</p>}
        {!cargando && clientesFiltrados.length === 0 && <p>No se encontraron clientes.</p>}

        <table className="tabla-clientes">
          <thead>
            <tr>
              <th>Nombre</th>
               <th>Apellido</th>
              <th>Teléfono</th>
              <th>Plan</th>
              <th>Horario</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => {
              const inscripcionesActivas = cliente.inscripcion.filter((i) => i.activa)

              return (
                <tr key={cliente.id}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.apellido}</td>
                  <td>{cliente.telefono}</td>
                  <td>{cliente.planes ? cliente.planes.nombre : 'Sin plan'}</td>
                  <td>
                    {inscripcionesActivas.length === 0 ? (
                      '-'
                    ) : (
                      <ul className="lista-horarios-tabla">
                        {inscripcionesActivas.map((i) => (
                          <li key={i.id}>
                            {i.clase.dia_semana} {i.clase.hora.slice(0, 5)}
                            {/* AGREGADO: botón de reprogramar por cada día puntual */}
                            <button
                              className="boton-link"
                              onClick={() => abrirModalReprogramar(cliente.id, i)}
                            >
                              Reprogramar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <span className={cliente.activo ? 'estado-activo' : 'estado-inactivo'}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {cliente.activo && (
                      <button className="boton-baja" onClick={() => manejarDarDeBaja(cliente)}>
                        Dar de baja
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* AGREGADO: modal de reprogramación */}
        {modalReprogramar && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Reprogramar turno</h2>
              <p>
                Día actual: <strong>{modalReprogramar.inscripcion.clase.dia_semana} {modalReprogramar.inscripcion.clase.hora.slice(0, 5)}</strong>
              </p>

              <label>Nueva clase</label>
              <select value={nuevaClaseId} onChange={(e) => setNuevaClaseId(e.target.value)}>
                <option value="">Seleccionar clase</option>
                {clases.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    {clase.dia_semana} {clase.hora.slice(0, 5)}
                  </option>
                ))}
              </select>

              <div className="acciones-modal">
                <button onClick={cerrarModal} className="boton-secundario">Cancelar</button>
                <button onClick={confirmarReprogramacion}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Clientes