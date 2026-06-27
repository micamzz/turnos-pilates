import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasEnRango } from '../services/reserva'
import { obtenerFeriadosEnRango, crearFeriado, eliminarFeriado } from '../services/feriado'
import { obtenerDiasDeLaSemana, formatearFechaISO, nombreDia, claseYaPaso, clientesEnClaseYFecha, } from '../utils/fechas'
import ModalConfirmacion from '../components/ModalConfirmacion/ModalConfirmacion.jsx'
import styles from './Agenda.module.css'

function Agenda() {
  const navegar = useNavigate()
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [reservasDelDia, setReservasDelDia] = useState([])
  const [feriados, setFeriados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalFeriadoAbierto, setModalFeriadoAbierto] = useState(false)


  const [confirmacionFeriado, setConfirmacionFeriado] = useState(null)

  const diasSemana = obtenerDiasDeLaSemana(offsetSemana)

  useEffect(() => {
    cargarDatos()
  }, [offsetSemana])

  async function cargarDatos() {
    setCargando(true)
    try {
      const fechasISO = diasSemana.map(formatearFechaISO)

      const [listaClases, listaInscripciones, reservas, listaFeriados] = await Promise.all([
        obtenerClases(),
        obtenerInscripcionesConClienteYClase(),
        obtenerReservasEnRango(fechasISO[0], fechasISO[4]),
        obtenerFeriadosEnRango(fechasISO[0], fechasISO[4]),
      ])

      setClases(listaClases)
      setInscripciones(listaInscripciones)
      setReservasDelDia(reservas)
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


  function pedirConfirmacionFeriado(fechaISO) {
    setConfirmacionFeriado({ fechaISO, esHabilitar: esFeriado(fechaISO) })
  }


  async function confirmarCambioFeriado() {
    const { fechaISO, esHabilitar } = confirmacionFeriado
    try {
      if (esHabilitar) {
        await eliminarFeriado(fechaISO)
      } else {
        await crearFeriado(fechaISO)
      }
      setConfirmacionFeriado(null)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo actualizar el día: ' + err.message)
    }
  }

  function cantidadInscriptos(claseId, fechaISO) {
    const inscripcionesDeLaClase = inscripciones.filter((i) => i.clase_id === claseId)
    return clientesEnClaseYFecha(inscripcionesDeLaClase, reservasDelDia, claseId, fechaISO).length
  }

  const horariosUnicos = [...new Set(clases.map((c) => c.hora))].sort()

  return (
    <Layout>

      <div className={styles.contenedorAgenda}>
        <div className={styles.encabezadoAgenda}>

          <button className={styles.botonNavegarSemana} onClick={() => setOffsetSemana((s) => s - 1)}>
            ← Anterior
          </button>

          <h1 className={styles.tituloPagina}>Agenda semanal</h1>
          <button className={styles.botonNavegarSemana} onClick={() => setOffsetSemana((s) => s + 1)}>
            Siguiente →
          </button>
        </div>

        <button className={styles.botonAbrirModalFeriado} onClick={() => setModalFeriadoAbierto(true)}>
          Inhabilitar día
        </button>

        {error && <p className={styles.mensajeError}>{error}</p>}
        {cargando && <p>Cargando agenda...</p>}

        {!cargando && (
          <table className={styles.tablaAgenda}>

            <thead>
              <tr>
                {diasSemana.map((fecha) => {
                  const fechaISO = formatearFechaISO(fecha)
                  const esHoy = fechaISO === formatearFechaISO(new Date())
                  return (
                    <th key={fechaISO} className={styles.encabezadoColumnaDia}>
                      {nombreDia(fecha).toUpperCase()}
                      <span className={styles.fechaChica}>
                        ({fecha.getDate()}/{fecha.getMonth() + 1}/{fecha.getFullYear()})
                      </span>
                      {/* muestra "HOY" solo en la columna del día actual */}
                      {esHoy && <span className={styles.etiquetaHoy}>HOY</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {horariosUnicos.map((hora) => (
                <tr key={hora}>
                  {diasSemana.map((fecha) => {
                    const diaNombre = nombreDia(fecha)
                    const fechaISO = formatearFechaISO(fecha)
                    const clase = clases.find((c) => c.dia_semana === diaNombre && c.hora === hora)

                    if (esFeriado(fechaISO)) {
                      return (
                        <td key={fechaISO} className={styles.celdaFeriado}>
                          <div className={styles.celdaFeriadoInner}>Feriado</div>
                        </td>
                      )
                    }

                    if (!clase) {
                      return <td key={fechaISO} className={styles.celdaVacia} />
                    }

                    const totalInscriptos = cantidadInscriptos(clase.id, fechaISO)
                    const cuposLibres = clase.capacidad - totalInscriptos
                    const pasada = claseYaPaso(fechaISO, hora)

                    return (
                      <td key={fechaISO} className={styles.celdaTurno}>

                        <div
                          className={`${styles.tarjetaClase} ${pasada ? styles.tarjetaPasada : styles.tarjetaClickeable}`}
                          onClick={() => navegar(`/agenda/${clase.id}/${fechaISO}`)}
                        >
                          <div className={styles.horaClase}>{hora.slice(0, 5)} hs</div>
                          <div className={styles.filaCupos}>
                            <span
                              className={`${styles.badgeCupos} ${cuposLibres > 0 ? styles.badgeCuposLibres : styles.badgeCuposCompleto}`}
                            >
                              {cuposLibres > 0 ? `${cuposLibres} libres` : 'Cupo completo'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Modal: Inhabilitar día */}
        {modalFeriadoAbierto && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button
                className={styles.botonCerrarModal}
                onClick={() => setModalFeriadoAbierto(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>

              <h2 className={styles.tituloModal}>Inhabilitar día</h2>
              <p className={styles.textoModal}>Elegí qué día de esta semana querés inhabilitar:</p>
              <ul className={styles.listaDiasModal}>
                {diasSemana.map((fecha) => {
                  const fechaISO = formatearFechaISO(fecha)
                  const yaEsFeriado = esFeriado(fechaISO)
                  return (
                    <li key={fechaISO} className={styles.itemDiaModal}>
                      <span>
                        {nombreDia(fecha)} {fecha.getDate()}/{fecha.getMonth() + 1}
                        {yaEsFeriado && <span className={styles.etiquetaFeriado}> (Feriado)</span>}
                      </span>

                      <button
                        className={yaEsFeriado ? styles.botonHabilitar : styles.botonInhabilitar}
                        onClick={() => pedirConfirmacionFeriado(fechaISO)}
                      >
                        {yaEsFeriado ? 'Habilitar' : 'Inhabilitar'}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className={styles.accionesModal}>
                <button onClick={() => setModalFeriadoAbierto(false)} className={styles.botonSecundario}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}


        {confirmacionFeriado && (
          <ModalConfirmacion
            mensaje={
              confirmacionFeriado.esHabilitar
                ? '¿Habilitar este día nuevamente?'
                : '¿Inhabilitar este día completo (ej. feriado)?'
            }
            alConfirmar={confirmarCambioFeriado}
            alCancelar={() => setConfirmacionFeriado(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default Agenda