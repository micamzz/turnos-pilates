import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerClientesConInscripciones, darDeBajaCliente, reactivarCliente } from '../services/clientes'
import { obtenerClases, verificarCupoDisponible } from '../services/clase'
import { reprogramarInscripcion, crearInscripciones } from '../services/inscripcion'
import { cancelarTurno } from '../services/reserva'
import { obtenerPlanes } from '../services/planes'
import { obtenerFeriadosEnRango } from '../services/feriado'
import { proximaFechaDeDia, formatearFechaISO, agruparClasesPorDia, primerYUltimoDiaDelMes, calcularCuposRealesPorFecha, } from '../utils/fechas'
import { Layout } from '../components/layout/Layout.jsx'
import ModalConfirmacion from '../components/ModalConfirmacion/ModalConfirmacion.jsx'
import styles from './Clientes.module.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [clases, setClases] = useState([])
  const [planes, setPlanes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [feriados, setFeriados] = useState([])

  const [clienteABajar, setClienteABajar] = useState(null)

  const [modalReprogramar, setModalReprogramar] = useState(null)
  const [nuevaClaseId, setNuevaClaseId] = useState('')

  const [modalCancelarDia, setModalCancelarDia] = useState(null)
  const [fechaCancelar, setFechaCancelar] = useState('')

  const [modalReactivar, setModalReactivar] = useState(null)
  const [planReactivarId, setPlanReactivarId] = useState('')
  const [clasesReactivarSeleccionadas, setClasesReactivarSeleccionadas] = useState([])

  /* Guarda el nombre del cliente recién reactivado, para mostrar el modal de confirmación de éxito. null = no hay aviso pendiente. */
  const [clienteReactivadoExitoso, setClienteReactivadoExitoso] = useState(null)

  const [inscripcionesPorClase, setInscripcionesPorClase] = useState([])
  const [reservasProximaSemana, setReservasProximaSemana] = useState([])

  const navegar = useNavigate()
  const [paginaActual, setPaginaActual] = useState(0)
  const CLIENTES_POR_PAGINA = 15

  useEffect(() => {
    cargarDatos()
  }, [])


  async function cargarDatos() {
    try {
      const [listaClientes, listaClases, listaPlanes, listaInscripciones] = await Promise.all([
        obtenerClientesConInscripciones(),
        obtenerClases(),
        obtenerPlanes(),
        obtenerInscripcionesConClienteYClase(),
      ])
      setClientes(listaClientes)
      setClases(listaClases)
      setPlanes(listaPlanes)
      setInscripcionesPorClase(listaInscripciones)

      const hoy = new Date()
      const en3Meses = new Date(hoy.getFullYear(), hoy.getMonth() + 3, 0)
      const { desde } = primerYUltimoDiaDelMes(hoy)
      const { hasta } = primerYUltimoDiaDelMes(en3Meses)
      const listaFeriados = await obtenerFeriadosEnRango(desde, hasta)
      setFeriados(listaFeriados)

      /* reservas de los próximos 7 días, para calcular cupo real  de la próxima ocurrencia de cada día de la semana */
      const en7Dias = new Date(hoy)
      en7Dias.setDate(hoy.getDate() + 7)
      const reservasSemana = await obtenerReservasEnRango(formatearFechaISO(hoy), formatearFechaISO(en7Dias))
      setReservasProximaSemana(reservasSemana)
    } catch (err) {
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }


  const clientesFiltrados = clientes
    .filter((c) => {
      const textoBusqueda = busqueda.trim().toLowerCase()
      const nombreCompleto = `${c.nombre} ${c.apellido || ''}`.toLowerCase()
      return nombreCompleto.includes(textoBusqueda)
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const totalPaginas = Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA)
  const clientesPaginados = clientesFiltrados.slice(
    paginaActual * CLIENTES_POR_PAGINA,
    (paginaActual + 1) * CLIENTES_POR_PAGINA
  )

  function handleBusqueda(e) {
    setBusqueda(e.target.value)
    setPaginaActual(0)
  }

  async function confirmarDarDeBaja() {
    try {
      await darDeBajaCliente(clienteABajar.id)
      setClienteABajar(null)
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
      const hayCupo = await verificarCupoDisponible(nuevaClaseId)
      if (!hayCupo) {
        setError('Esa clase ya no tiene cupo disponible')
        return
      }

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
      for (const claseId of clasesReactivarSeleccionadas) {
        const hayCupo = await verificarCupoDisponible(claseId)
        if (!hayCupo) {
          const clase = clases.find((c) => c.id === claseId)
          setError(`La clase de ${clase?.dia_semana} ${clase?.hora.slice(0, 5)} ya no tiene cupo disponible`)
          return
        }
      }

      const nombreCliente = modalReactivar.nombre

      await reactivarCliente(modalReactivar.id, planReactivarId)

      const nuevasInscripciones = clasesReactivarSeleccionadas.map((claseId) => ({
        cliente_id: modalReactivar.id,
        clase_id: claseId,
      }))
      await crearInscripciones(nuevasInscripciones)

      cerrarModalReactivar()
      setClienteReactivadoExitoso(nombreCliente)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo reactivar: ' + err.message)
    }
  }

  const clasesPorDia = agruparClasesPorDia(clases)

  return (
    <Layout>
      <div className={styles.contenedorClientes}>
        <div className={styles.encabezadoClientes}>
          <h1 className={styles.tituloPagina}>Alumnos</h1>
          <button className={styles.botonAgregarCliente} onClick={() => navegar('/agregar-cliente')}>
            + Nuevo Alumno
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
          value={busqueda}
          onChange={handleBusqueda}
          className={styles.buscadorClientes}
        />

        {cargando && <p>Cargando alumnos...</p>}
        {error && <p className={styles.mensajeError}>{error}</p>}
        {!cargando && clientesFiltrados.length === 0 && <p>No se encontraron alumnos.</p>}

        <table className={styles.tablaClientes}>
          <thead>
            <tr>
              <th className={styles.encabezadoColumna}>Nombre</th>
              <th className={styles.encabezadoColumna}>Apellido</th>
              <th className={styles.encabezadoColumna}>Teléfono</th>
              <th className={styles.encabezadoColumna}>Plan</th>
              <th className={styles.encabezadoColumna}>Horario</th>
              <th className={styles.encabezadoColumna}>Turno</th>
              <th className={styles.encabezadoColumna}>Estado</th>
              <th className={styles.encabezadoColumna}></th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginados.map((cliente) => {
              const inscripcionesActivas = cliente.inscripcion.filter((i) => i.activa)

              return (
                <tr
                  key={cliente.id}
                  className={`${styles.filaCliente} ${!cliente.activo ? styles.filaInactiva : ''}`}
                >
                  <td className={styles.celdaTabla}>{cliente.nombre}</td>
                  <td className={styles.celdaTabla}>{cliente.apellido}</td>
                  <td className={styles.celdaTabla}>{cliente.telefono}</td>
                  <td className={styles.celdaTabla}>{cliente.planes ? cliente.planes.nombre : 'Sin plan'}</td>
                  <td className={styles.celdaTabla}>
                    {inscripcionesActivas.length === 0 ? (
                      '-'
                    ) : (
                      <ul className={styles.listaHorariosTabla}>
                        {inscripcionesActivas.map((i) => (
                          <li key={i.id} className={styles.itemHorarioTabla}>
                            {i.clase.dia_semana} {i.clase.hora.slice(0, 5)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={styles.celdaTabla}>
                    {cliente.activo && inscripcionesActivas.length > 0 && (
                      <div className={styles.accionesHorario}>
                        <button
                          className={styles.botonLink}
                          onClick={() => abrirModalReprogramar(cliente.id, inscripcionesActivas)}
                        >
                          Reprogramar
                        </button>
                        <button
                          className={`${styles.botonLink} ${styles.botonLinkRojo}`}
                          onClick={() => abrirModalCancelarDia(cliente.id, inscripcionesActivas)}
                        >
                          Cancelar día
                        </button>
                      </div>
                    )}
                  </td>
                  <td className={styles.celdaTabla}>
                    <span className={cliente.activo ? styles.estadoActivo : styles.estadoInactivo}>
                      {cliente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className={styles.celdaTabla}>
                    {cliente.activo ? (
                      <button className={styles.botonBaja} onClick={() => setClienteABajar(cliente)}>
                        Dar de baja
                      </button>
                    ) : (
                      <button className={styles.botonReactivar} onClick={() => abrirModalReactivar(cliente)}>
                        Reactivar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className={styles.paginacion}>
            <button
              className={styles.botonPagina}
              onClick={() => setPaginaActual((p) => p - 1)}
              disabled={paginaActual === 0}
            >
              ← Anterior
            </button>
            <span className={styles.paginaInfo}>
              {paginaActual + 1} / {totalPaginas}
            </span>
            <button
              className={styles.botonPagina}
              onClick={() => setPaginaActual((p) => p + 1)}
              disabled={paginaActual >= totalPaginas - 1}
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Modal: Reprogramar */}
        {modalReprogramar && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button className={styles.botonCerrarModal} onClick={cerrarModalReprogramar} aria-label="Cerrar">
                ✕
              </button>

              <h2 className={styles.tituloModal}>Reprogramar turno</h2>

              {!modalReprogramar.inscripcionElegida ? (
                <>
                  <p className={styles.textoModal}>¿Cuál día querés reprogramar?</p>
                  <ul className={styles.listaDiasModal}>
                    {modalReprogramar.inscripciones.map((i) => (
                      <li key={i.id} className={styles.itemDiaModal}>
                        <span>{i.clase.dia_semana} {i.clase.hora.slice(0, 5)}</span>

                        <button className={styles.botonInhabilitar}
                          onClick={() => setModalReprogramar((prev) => ({ ...prev, inscripcionElegida: i }))} >
                          Elegir  </button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.accionesModal}>
                    <button onClick={cerrarModalReprogramar} className={styles.botonSecundario}>Cerrar</button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.textoModal}>
                    Día actual: <strong>
                      {modalReprogramar.inscripcionElegida.clase.dia_semana}{' '}
                      {modalReprogramar.inscripcionElegida.clase.hora.slice(0, 5)}
                    </strong>
                  </p>
                  <label className={styles.etiquetaModal}>Nueva clase</label>

                  <select className={styles.campoSelectModal} value={nuevaClaseId} onChange={(e) => setNuevaClaseId(e.target.value)}>
                    <option value="">Seleccionar clase</option>
                    {clases.map((clase) => {
                      const proximaFecha = formatearFechaISO(proximaFechaDeDia(clase.dia_semana))
                      const inscripcionesDeEstaClase = inscripcionesPorClase.filter((i) => i.clase_id === clase.id)
                      const cuposReales = calcularCuposRealesPorFecha(clase, inscripcionesDeEstaClase, reservasProximaSemana, proximaFecha)

                      return (
                        <option key={clase.id} value={clase.id} disabled={cuposReales <= 0}>
                          {clase.dia_semana} {clase.hora.slice(0, 5)}
                          {cuposReales <= 0 ? ' - COMPLETO' : ` - ${cuposReales} libres`}
                        </option>
                      )
                    })}
                  </select>


                  <div className={styles.accionesModal}>
                    <button onClick={cerrarModalReprogramar} className={styles.botonSecundario}>Cancelar</button>
                    <button className={styles.botonConfirmar} onClick={confirmarReprogramacion}>Confirmar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Cancelar día puntual */}
        {modalCancelarDia && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button className={styles.botonCerrarModal} onClick={cerrarModalCancelarDia} aria-label="Cerrar">
                ✕
              </button>

              <h2 className={styles.tituloModal}>Cancelar día puntual</h2>

              {!modalCancelarDia.inscripcionElegida ? (
                <>
                  <p className={styles.textoModal}>¿Cuál día querés cancelar?</p>
                  <ul className={styles.listaDiasModal}>
                    {modalCancelarDia.inscripciones.map((i) => (
                      <li key={i.id} className={styles.itemDiaModal}>
                        <span>{i.clase.dia_semana} {i.clase.hora.slice(0, 5)}</span>
                        <button className={styles.botonInhabilitar} onClick={() => elegirInscripcionParaCancelar(i)}>
                          Elegir
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.accionesModal}>
                    <button onClick={cerrarModalCancelarDia} className={styles.botonSecundario}>Cerrar</button>
                  </div>
                </>
              ) : (
                <>
                  <p className={styles.textoModal}>
                    Día fijo: <strong>
                      {modalCancelarDia.inscripcionElegida.clase.dia_semana}{' '}
                      {modalCancelarDia.inscripcionElegida.clase.hora.slice(0, 5)}
                    </strong>
                  </p>
                  <label className={styles.etiquetaModal}>Fecha a cancelar</label>
                  <input
                    type="date"
                    className={styles.campoFechaModal}
                    value={fechaCancelar}
                    onChange={(e) => setFechaCancelar(e.target.value)}
                  />
                  <p className={styles.ayudaPlan}>El cliente vuelve a su horario normal la semana siguiente.</p>
                  <div className={styles.accionesModal}>
                    <button onClick={cerrarModalCancelarDia} className={styles.botonSecundario}>Cancelar</button>
                    <button className={styles.botonConfirmar} onClick={confirmarCancelarDia}>Confirmar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal: Reactivar cliente */}
        {modalReactivar && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button className={styles.botonCerrarModal} onClick={cerrarModalReactivar} aria-label="Cerrar">
                ✕
              </button>

              <h2 className={styles.tituloModal}>Reactivar a {modalReactivar.nombre}</h2>

              <div className={styles.modalContenidoScroll}>
                <label className={styles.etiquetaModal}>Plan</label>
                <select
                  className={styles.campoSelectModal}
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
                    <p className={styles.ayudaPlan}>
                      Seleccionaste <strong>{clasesReactivarSeleccionadas.length}</strong> de{' '}
                      <strong>{maximoClasesReactivar}</strong> día(s)
                    </p>
                    {clasesPorDia.map(({ dia, clases: clasesDelDia }) => (
                      <div key={dia} className={styles.grupoDia}>
                        <strong className={styles.nombreDia}>{dia}</strong>
                        <div className={styles.listaHorarios}>
                          {clasesDelDia.map((clase) => {
                            const estaSeleccionada = clasesReactivarSeleccionadas.includes(clase.id)
                            const sinCupos = clase.cuposDisponibles <= 0
                            const deshabilitado =
                              sinCupos ||
                              (!estaSeleccionada &&
                                maximoClasesReactivar &&
                                clasesReactivarSeleccionadas.length >= maximoClasesReactivar)

                            return (
                              <label
                                key={clase.id}
                                className={`${styles.opcionHorario} ${deshabilitado ? styles.opcionHorarioDeshabilitado : ''}`}
                              >
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
              </div>

              <div className={styles.accionesModal}>
                <button onClick={cerrarModalReactivar} className={styles.botonSecundario}>Cancelar</button>
                <button className={styles.botonConfirmar} onClick={confirmarReactivacion}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: dar de baja */}
        {clienteABajar && (
          <ModalConfirmacion
            mensaje={`¿Dar de baja a ${clienteABajar.nombre}?`}
            alConfirmar={confirmarDarDeBaja}
            alCancelar={() => setClienteABajar(null)}
          />
        )}

        {/* Modal: reactivación exitosa */}
        {clienteReactivadoExitoso && (
          <ModalConfirmacion
            mensaje="Cliente dado de alta correctamente"
            alConfirmar={() => setClienteReactivadoExitoso(null)}
            textoBoton="Aceptar"
          />
        )}
      </div>
    </Layout>
  )
}

export default Clientes