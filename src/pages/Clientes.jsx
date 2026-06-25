import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerClientesConInscripciones, darDeBajaCliente, reactivarCliente } from '../services/clientes'
import { obtenerClases } from '../services/clase'
import { reprogramarInscripcion } from '../services/inscripcion'
import { crearInscripciones } from '../services/inscripcion'
import { cancelarTurno } from '../services/reserva'
import { obtenerPlanes } from '../services/planes'
import { obtenerFeriadosEnRango } from '../services/feriado'
import { proximaFechaDeDia, formatearFechaISO } from '../utils/fechas'
import { Layout } from '../components/layout/Layout.jsx'
import './Clientes.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [clases, setClases] = useState([])
  const [planes, setPlanes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [feriados, setFeriados] = useState([])

  // Modal Reprogramar: { clienteId, inscripciones, inscripcionElegida } o null
  const [modalReprogramar, setModalReprogramar] = useState(null)
  const [nuevaClaseId, setNuevaClaseId] = useState('')

  // Modal Cancelar día: { clienteId, inscripciones, inscripcionElegida } o null
  const [modalCancelarDia, setModalCancelarDia] = useState(null)
  const [fechaCancelar, setFechaCancelar] = useState('')

  // Modal Reactivar: cliente o null
  const [modalReactivar, setModalReactivar] = useState(null)
  const [planReactivarId, setPlanReactivarId] = useState('')
  const [clasesReactivarSeleccionadas, setClasesReactivarSeleccionadas] = useState([])

  const navegar = useNavigate()

  useEffect(() => {
    cargarDatos()
  }, [])

 async function cargarDatos() {
  try {
    const [listaClientes, listaClases, listaPlanes] = await Promise.all([
      obtenerClientesConInscripciones(),
      obtenerClases(),
      obtenerPlanes(),
    ])
    setClientes(listaClientes)
    setClases(listaClases)
    setPlanes(listaPlanes)

    // feriados de los próximos 3 meses, para validar el selector de fecha
    const hoy = new Date()
    const en3Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)
    const formatear = (d) => d.toISOString().slice(0, 10)
    const listaFeriados = await obtenerFeriadosEnRango(formatear(hoy), formatear(en3Meses))
    setFeriados(listaFeriados)
  } catch (err) {
    setError('No se pudieron cargar los datos: ' + err.message)
  } finally {
    setCargando(false)
  }
}

  // Busca por nombre + apellido, ignora espacios extra, ordena A-Z
  const clientesFiltrados = clientes
    .filter((c) => {
      const textoBusqueda = busqueda.trim().toLowerCase()
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase()
      return nombreCompleto.includes(textoBusqueda)
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function manejarDarDeBaja(cliente) {
    const confirmado = window.confirm(`¿Dar de baja a ${cliente.nombre}?`)
    if (!confirmado) return

    try {
      await darDeBajaCliente(cliente.id)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo dar de baja: ' + err.message)
    }
  }

  // ---- Reprogramar (mensual / permanente) ----
  function abrirModalReprogramar(clienteId, inscripciones) {
    setModalReprogramar({ clienteId, inscripciones, inscripcionElegida: null })
    setNuevaClaseId('')
  }

  function cerrarModalReprogramar() {
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
        modalReprogramar.inscripcionElegida.id,
        modalReprogramar.clienteId,
        nuevaClaseId
      )
      cerrarModalReprogramar()
      await cargarDatos()
    } catch (err) {
      setError('No se pudo reprogramar: ' + err.message)
    }
  }

  // ---- Cancelar día (puntual, por fecha) ----
  function abrirModalCancelarDia(clienteId, inscripciones) {
    setModalCancelarDia({ clienteId, inscripciones, inscripcionElegida: null })
    setFechaCancelar('')
  }

  function cerrarModalCancelarDia() {
    setModalCancelarDia(null)
    setFechaCancelar('')
  }

  function elegirInscripcionParaCancelar(inscripcion) {
    const fechaSugerida = formatearFechaISO(proximaFechaDeDia(inscripcion.clase.dia_semana))
    setFechaCancelar(fechaSugerida)
    setModalCancelarDia((prev) => ({ ...prev, inscripcionElegida: inscripcion }))
  }

 async function confirmarCancelarDia() {
  if (!fechaCancelar) {
    setError('Seleccioná una fecha')
    return
  }

  // bloquea si la fecha elegida es feriado
  const esFeriado = feriados.some((f) => f.fecha === fechaCancelar)
  if (esFeriado) {
    setError('Esa fecha está marcada como feriado, no se puede cancelar un turno ahí')
    return
  }

  try {
    await cancelarTurno(
      modalCancelarDia.clienteId,
      modalCancelarDia.inscripcionElegida.clase_id,
      fechaCancelar
    )
    cerrarModalCancelarDia()
    await cargarDatos()
  } catch (err) {
    setError('No se pudo cancelar el día: ' + err.message)
  }
}

  // ---- Reactivar cliente (con nuevo plan y días) ----
  function abrirModalReactivar(cliente) {
    setModalReactivar(cliente)
    setPlanReactivarId('')
    setClasesReactivarSeleccionadas([])
  }

  function cerrarModalReactivar() {
    setModalReactivar(null)
    setPlanReactivarId('')
    setClasesReactivarSeleccionadas([])
  }

  function alternarClaseReactivar(claseId) {
    setClasesReactivarSeleccionadas((actual) =>
      actual.includes(claseId) ? actual.filter((id) => id !== claseId) : [...actual, claseId]
    )
  }

  const planReactivarSeleccionado = planes.find((p) => p.id === planReactivarId)
  const maximoClasesReactivar = planReactivarSeleccionado ? planReactivarSeleccionado.cantidad_clases / 4 : null

  async function confirmarReactivacion() {
    if (!planReactivarId) {
      setError('Seleccioná un plan')
      return
    }
    if (clasesReactivarSeleccionadas.length === 0) {
      setError('Seleccioná al menos un día')
      return
    }

    try {
      await reactivarCliente(modalReactivar.id, planReactivarId)

      const nuevasInscripciones = clasesReactivarSeleccionadas.map((claseId) => ({
        cliente_id: modalReactivar.id,
        clase_id: claseId,
      }))
      await crearInscripciones(nuevasInscripciones)

      cerrarModalReactivar()
      await cargarDatos()
    } catch (err) {
      setError('No se pudo reactivar: ' + err.message)
    }
  }

  const diasOrdenados = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
  const clasesPorDiaReactivar = diasOrdenados.map((dia) => ({
    dia,
    clases: clases.filter((c) => c.dia_semana === dia),
  }))

  return (
    <Layout>
      <div className="contenedor-clientes">
        <div className="encabezado-clientes">
          <h1>Clientes</h1>
          <button onClick={() => navegar('/agregar-cliente')}>+ Agregar Cliente</button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
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
              <th>Acciones</th>
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
                      <>
                        <ul className="lista-horarios-tabla">
                          {inscripcionesActivas.map((i) => (
                            <li key={i.id}>{i.clase.dia_semana} {i.clase.hora.slice(0, 5)}</li>
                          ))}
                        </ul>

                        <div className="acciones-horario">
                          <button
                            className="boton-link"
                            onClick={() => abrirModalReprogramar(cliente.id, inscripcionesActivas)}
                          >
                            Reprogramar
                          </button>
                          <button
                            className="boton-link boton-link-rojo"
                            onClick={() => abrirModalCancelarDia(cliente.id, inscripcionesActivas)}
                          >
                            Cancelar día
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={cliente.activo ? 'estado-activo' : 'estado-inactivo'}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    {cliente.activo ? (
                      <button className="boton-baja" onClick={() => manejarDarDeBaja(cliente)}>
                        Dar de baja
                      </button>
                    ) : (
                      <button className="boton-reactivar" onClick={() => abrirModalReactivar(cliente)}>
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Modal: Reprogramar */}
        {modalReprogramar && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Reprogramar turno</h2>

              {!modalReprogramar.inscripcionElegida ? (
                <>
                  <p>¿Cuál día querés reprogramar?</p>
                  <ul className="lista-dias-modal">
                    {modalReprogramar.inscripciones.map((i) => (
                      <li key={i.id} className="item-dia-modal">
                        <span>{i.clase.dia_semana} {i.clase.hora.slice(0, 5)}</span>
                        <button
                          className="boton-inhabilitar"
                          onClick={() => setModalReprogramar((prev) => ({ ...prev, inscripcionElegida: i }))}
                        >
                          Elegir
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="acciones-modal">
                    <button onClick={cerrarModalReprogramar} className="boton-secundario">Cerrar</button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Día actual: <strong>
                      {modalReprogramar.inscripcionElegida.clase.dia_semana}{' '}
                      {modalReprogramar.inscripcionElegida.clase.hora.slice(0, 5)}
                    </strong>
                  </p>
                  <label>Nueva clase</label>
                  <select value={nuevaClaseId} onChange={(e) => setNuevaClaseId(e.target.value)}>
                    <option value="">Seleccionar clase</option>
                    {clases.map((clase) => (
                      <option key={clase.id} value={clase.id} disabled={clase.cuposDisponibles <= 0}>
                        {clase.dia_semana} {clase.hora.slice(0, 5)}
                        {clase.cuposDisponibles <= 0 ? ' - COMPLETO' : ` - ${clase.cuposDisponibles} libres`}
                      </option>
                    ))}
                  </select>
                  <div className="acciones-modal">
                    <button onClick={cerrarModalReprogramar} className="boton-secundario">Cancelar</button>
                    <button onClick={confirmarReprogramacion}>Confirmar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Cancelar día puntual */}
        {modalCancelarDia && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Cancelar día puntual</h2>

              {!modalCancelarDia.inscripcionElegida ? (
                <>
                  <p>¿Cuál día querés cancelar?</p>
                  <ul className="lista-dias-modal">
                    {modalCancelarDia.inscripciones.map((i) => (
                      <li key={i.id} className="item-dia-modal">
                        <span>{i.clase.dia_semana} {i.clase.hora.slice(0, 5)}</span>
                        <button className="boton-inhabilitar" onClick={() => elegirInscripcionParaCancelar(i)}>
                          Elegir
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="acciones-modal">
                    <button onClick={cerrarModalCancelarDia} className="boton-secundario">Cerrar</button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Día fijo: <strong>
                      {modalCancelarDia.inscripcionElegida.clase.dia_semana}{' '}
                      {modalCancelarDia.inscripcionElegida.clase.hora.slice(0, 5)}
                    </strong>
                  </p>
                  <label>Fecha a cancelar</label>
                  <input type="date" value={fechaCancelar} onChange={(e) => setFechaCancelar(e.target.value)} />
                  <p className="ayuda-plan">El cliente vuelve a su horario normal la semana siguiente.</p>
                  <div className="acciones-modal">
                    <button onClick={cerrarModalCancelarDia} className="boton-secundario">Cancelar</button>
                    <button onClick={confirmarCancelarDia}>Confirmar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Reactivar cliente */}
        {modalReactivar && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Reactivar a {modalReactivar.nombre}</h2>

              <label>Plan</label>
              <select
                value={planReactivarId}
                onChange={(e) => {
                  setPlanReactivarId(e.target.value)
                  setClasesReactivarSeleccionadas([])
                }}
              >
                <option value="">Seleccionar plan</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} ({plan.cantidad_clases} clases/mes)
                  </option>
                ))}
              </select>

              {planReactivarSeleccionado && (
                <>
                  <p className="ayuda-plan">
                    Seleccionaste <strong>{clasesReactivarSeleccionadas.length}</strong> de{' '}
                    <strong>{maximoClasesReactivar}</strong> día(s)
                  </p>
                  {clasesPorDiaReactivar.map(({ dia, clases: clasesDelDia }) => (
                    <div key={dia} className="grupo-dia">
                      <strong>{dia}</strong>
                      <div className="lista-horarios">
                        {clasesDelDia.map((clase) => {
                          const estaSeleccionada = clasesReactivarSeleccionadas.includes(clase.id)
                          const sinCupos = clase.cuposDisponibles <= 0
                          const deshabilitado =
                            sinCupos ||
                            (!estaSeleccionada &&
                              maximoClasesReactivar &&
                              clasesReactivarSeleccionadas.length >= maximoClasesReactivar)

                          return (
                            <label key={clase.id} className={`opcion-horario${deshabilitado ? ' deshabilitado' : ''}`}>
                              <input
                                type="checkbox"
                                checked={estaSeleccionada}
                                disabled={deshabilitado}
                                onChange={() => alternarClaseReactivar(clase.id)}
                              />
                              {clase.hora.slice(0, 5)}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="acciones-modal">
                <button onClick={cerrarModalReactivar} className="boton-secundario">Cancelar</button>
                <button onClick={confirmarReactivacion}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Clientes