import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasPorFecha, cancelarTurno } from '../services/reserva'
import { obtenerFeriadosEnRango, crearFeriado, eliminarFeriado } from '../services/feriado'
import { obtenerDiasDeLaSemana, formatearFechaISO, nombreDia } from '../utils/fechas'
import './Agenda.css'

function Agenda() {
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [reservasCanceladas, setReservasCanceladas] = useState([])
  const [feriados, setFeriados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalFeriadoAbierto, setModalFeriadoAbierto] = useState(false)

  const diasSemana = obtenerDiasDeLaSemana(offsetSemana)

  useEffect(() => {
    cargarDatos()
  }, [offsetSemana])

  async function cargarDatos() {
    setCargando(true)
    try {
      const [listaClases, listaInscripciones] = await Promise.all([
        obtenerClases(),
        obtenerInscripcionesConClienteYClase(),
      ])
      setClases(listaClases)
      setInscripciones(listaInscripciones)

      const fechasISO = diasSemana.map(formatearFechaISO)
      const resultados = await Promise.all(fechasISO.map(obtenerReservasPorFecha))
      setReservasCanceladas(resultados.flat())

      const listaFeriados = await obtenerFeriadosEnRango(fechasISO[0], fechasISO[4])
      setFeriados(listaFeriados)
    } catch (err) {
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  function esFeriado(fechaISO) {
    return feriados.some((f) => f.fecha === fechaISO)
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

  function clientesDeLaCelda(claseId, fechaISO) {
    const inscriptos = inscripciones.filter((i) => i.clase_id === claseId)

    return inscriptos.filter((i) => {
      const fueCancelado = reservasCanceladas.some(
        (r) =>
          r.cliente_id === i.cliente_id &&
          r.clase_id === claseId &&
          r.fecha === fechaISO &&
          r.estado === 'CANCELADA'
      )
      return !fueCancelado
    })
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
                      <td key={fechaISO} className="celda-turno">
                        {clientesActivos.map((i) => (
                          <div key={i.id} className="chip-cliente">
                            {i.clientes.nombre}
                            <button
                              className="boton-cancelar-chip"
                              title="Cancelar este turno"
                              onClick={() => manejarCancelar(i.cliente_id, clase.id, fechaISO)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <span className={cuposLibres > 0 ? 'cupos-libres' : 'sin-cupos'}>
                          {cuposLibres > 0 ? `${cuposLibres} libres` : 'COMPLETO'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

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
      </div>
    </Layout>
  )
}

export default Agenda