import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasPorFecha, obtenerReservasEnRango, cancelarTurno, obtenerCancelacionesDelMes, crearRecupero } from '../services/reserva'
import { obtenerFeriadosEnRango, crearFeriado, eliminarFeriado } from '../services/feriado'
import { obtenerDiasDeLaSemana, formatearFechaISO, nombreDia } from '../utils/fechas'
import './Agenda.css'

function Agenda() {
   console.count('RENDER AGENDA')
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [reservasDelDia, setReservasDelDia] = useState([])
  const [feriados, setFeriados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalFeriadoAbierto, setModalFeriadoAbierto] = useState(false)

  const [modalRecupero, setModalRecupero] = useState(null)
  const [cancelacionesDelMes, setCancelacionesDelMes] = useState([])

  const diasSemana = obtenerDiasDeLaSemana(offsetSemana)

  useEffect(() => {
    cargarDatos()
  }, [offsetSemana])

async function cargarDatos() {
  setCargando(true)

  try {
    const fechasISO = diasSemana.map(formatearFechaISO)

    console.time('CARGA TOTAL')

    const [
      listaClases,
      listaInscripciones,
      reservas,
      listaFeriados,
      cancelaciones
    ] = await Promise.all([
      obtenerClases(),
      obtenerInscripcionesConClienteYClase(),
      obtenerReservasEnRango(
        fechasISO[0],
        fechasISO[4]
      ),
      obtenerFeriadosEnRango(
        fechasISO[0],
        fechasISO[4]
      ),
      obtenerCancelacionesDelMes(
        fechasISO[0]
      )
    ])

    console.timeEnd('CARGA TOTAL')

    setClases(listaClases)
    setInscripciones(listaInscripciones)
    setReservasDelDia(reservas)
    setFeriados(listaFeriados)
    setCancelacionesDelMes(cancelaciones)

  } catch (err) {
    setError(
      'No se pudieron cargar los datos: ' +
      err.message
    )
  } finally {
    setCargando(false)
  }
}

  // ---- Modal de recupero ----
  function abrirModalRecupero(claseId, fechaISO) {
    setModalRecupero({ claseId, fechaISO })
  }

  function cerrarModalRecupero() {
    setModalRecupero(null)
  }

  async function confirmarRecupero(cancelacion) {
    try {
      await crearRecupero(cancelacion.cliente_id, modalRecupero.claseId, modalRecupero.fechaISO)
      cerrarModalRecupero()
      await cargarDatos()
    } catch (err) {
      setError('No se pudo registrar el recupero: ' + err.message)
    }
  }

  // ---- Feriados ----
  function esFeriado(fechaISO) {
    return feriados.some((f) => f.fecha === fechaISO)
  }

  function esFechaPasada(fechaISO) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const fecha = new Date(fechaISO)
  fecha.setHours(0, 0, 0, 0)

  return fecha < hoy
}

  async function manejarFeriado(fechaISO) {
    if (esFeriado(fechaISO)) {
      const confirmado = window.confirm('¿Habilitar este día nuevamente?')
      if (!confirmado) return
      try {
        await eliminarFeriado(fechaISO)
        await cargarDatos()
      } catch (err) {
        setError('No se pudo habilitar el día: ' + err.message)
      }
    } else {
      const confirmado = window.confirm('¿Inhabilitar este día completo (ej. feriado)?')
      if (!confirmado) return
      try {
        await crearFeriado(fechaISO)
        await cargarDatos()
      } catch (err) {
        setError('No se pudo inhabilitar el día: ' + err.message)
      }
    }
  }

  // ---- Cancelar turno puntual + sumar recuperos ----
  function clientesDeLaCelda(claseId, fechaISO) {
    const inscriptos = inscripciones.filter((i) => i.clase_id === claseId)

    const fijosActivos = inscriptos.filter((i) => {
      const fueCancelado = reservasDelDia.some( // CAMBIADO
        (r) =>
          r.cliente_id === i.cliente_id &&
          r.clase_id === claseId &&
          r.fecha === fechaISO &&
          r.estado === 'CANCELADA'
      )
      return !fueCancelado
    })

    // Clientes que recuperan en esta clase/fecha puntual (no son su día fijo)
    const recuperos = reservasDelDia.filter( // CAMBIADO
      (r) => r.clase_id === claseId && r.fecha === fechaISO && r.estado === 'RECUPERO'
    )

    const recuperosFormateados = recuperos.map((r) => ({
      id: `recupero-${r.id}`,
      cliente_id: r.cliente_id,
      clientes: r.clientes,
      esRecupero: true,
    }))

    return [...fijosActivos, ...recuperosFormateados]
  }

  async function manejarCancelar(clienteId, claseId, fechaISO) {
    const confirmado = window.confirm('¿Cancelar este turno puntual?')
    if (!confirmado) return

    try {
      await cancelarTurno(clienteId, claseId, fechaISO)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo cancelar: ' + err.message)
    }
  }

  const horariosUnicos = [...new Set(clases.map((c) => c.hora))].sort()

  return (
    <Layout>
      <div className="contenedor-agenda">
        <div className="encabezado-agenda">
          <button onClick={() => setOffsetSemana((s) => s - 1)}>← Semana anterior</button>
          <h1>Agenda semanal</h1>
          <button onClick={() => setOffsetSemana((s) => s + 1)}>Semana siguiente →</button>
        </div>

        <button className="boton-abrir-modal-feriado" onClick={() => setModalFeriadoAbierto(true)}>
          Inhabilitar día
        </button>

        {error && <p className="mensaje-error">{error}</p>}
        {cargando && <p>Cargando agenda...</p>}

        {!cargando && (
          <table className="tabla-agenda">
            <thead>
              <tr>
                <th>Hora</th>
                {diasSemana.map((fecha) => {
                  const fechaISO = formatearFechaISO(fecha)
                  return (
                    <th key={fechaISO}>
                      {nombreDia(fecha)}{' '}
                      <span className="fecha-chica">
                        {fecha.getDate()}/{fecha.getMonth() + 1}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {horariosUnicos.map((hora) => (
                <tr key={hora}>
                  <td className="celda-hora">{hora.slice(0, 5)}</td>
                  {diasSemana.map((fecha) => {
                    const diaNombre = nombreDia(fecha)
                    const fechaISO = formatearFechaISO(fecha)
                    const clase = clases.find((c) => c.dia_semana === diaNombre && c.hora === hora)

                    if (esFeriado(fechaISO)) {
                      return (
                        <td key={fechaISO} className="celda-feriado">
                          Feriado
                        </td>
                      )
                    }

                    if (!clase) {
                      return (
                        <td key={fechaISO} className="celda-vacia">
                          -
                        </td>
                      )
                    }

                    const clientesActivos = clientesDeLaCelda(clase.id, fechaISO)
                    const cuposLibres = clase.capacidad - clientesActivos.length

                    return (
                      <td
  key={fechaISO}
  className={`celda-turno ${
    esFechaPasada(fechaISO) ? 'celda-pasada' : ''
  }`}
>
                        {clientesActivos.map((i) => (
                          <div key={i.id} className="chip-cliente">
                            {i.clientes.nombre}
                            {!esFechaPasada(fechaISO) && (
  <button
    className="boton-cancelar-chip"
    title="Cancelar este turno"
    onClick={() => manejarCancelar(i.cliente_id, clase.id, fechaISO)}
  >
    ✕
  </button>
)}
                          </div>
                        ))}
                        <div className="fila-cupos">
                          <span className={cuposLibres > 0 ? 'cupos-libres' : 'sin-cupos'}>
                            {cuposLibres > 0 ? `${cuposLibres} libres` : 'COMPLETO'}
                          </span>
                         {cuposLibres > 0 && !esFechaPasada(fechaISO) && (
  <button
    className="boton-mas-recupero"
    title="Agregar cliente que recupera clase"
    onClick={() => abrirModalRecupero(clase.id, fechaISO)}
  >
    +
  </button>
)}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal: Inhabilitar día (feriado) */}
        {modalFeriadoAbierto && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Inhabilitar día</h2>
              <p>Elegí qué día de esta semana querés inhabilitar:</p>

              <ul className="lista-dias-modal">
                {diasSemana.map((fecha) => {
                  const fechaISO = formatearFechaISO(fecha)
                  const yaEsFeriado = esFeriado(fechaISO)

                  return (
                    <li key={fechaISO} className="item-dia-modal">
                      <span>
                        {nombreDia(fecha)} {fecha.getDate()}/{fecha.getMonth() + 1}
                        {yaEsFeriado && <span className="etiqueta-feriado"> (Feriado)</span>}
                      </span>
                      <button
                        className={yaEsFeriado ? 'boton-habilitar' : 'boton-inhabilitar'}
                        onClick={() => manejarFeriado(fechaISO)}
                      >
                        {yaEsFeriado ? 'Habilitar' : 'Inhabilitar'}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="acciones-modal">
                <button onClick={() => setModalFeriadoAbierto(false)} className="boton-secundario">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Recuperar clase */}
        {modalRecupero && (
          <div className="overlay-modal">
            <div className="modal">
              <h2>Recuperar clase</h2>
              <p>Elegí qué cliente con cancelación pendiente este mes va a recuperar acá:</p>

              {cancelacionesDelMes.length === 0 ? (
                <p className="ayuda-plan">No hay cancelaciones pendientes este mes.</p>
              ) : (
                <ul className="lista-dias-modal">
                  {cancelacionesDelMes.map((c) => (
                    <li key={c.id} className="item-dia-modal">
                      <span>
                        {c.clientes.nombre} {c.clientes.apellido} — canceló el {c.fecha}
                      </span>
                      <button className="boton-habilitar" onClick={() => confirmarRecupero(c)}>
                        Asignar acá
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="acciones-modal">
                <button onClick={cerrarModalRecupero} className="boton-secundario">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Agenda