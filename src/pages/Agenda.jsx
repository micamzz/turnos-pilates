import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasEnRango } from '../services/reserva'
import { obtenerFeriadosEnRango, crearFeriado, eliminarFeriado } from '../services/feriado'
import {
  obtenerDiasDeLaSemana,
  calcularDiaConOffset,
  formatearFechaISO,
  nombreDia,
  esFechaPasada,
  clientesEnClaseYFecha,
} from '../utils/fechas'
import { useEsMobile } from '../utils/useEsMobile'
import ModalConfirmacion from '../components/ModalConfirmacion/ModalConfirmacion.jsx'
import styles from './Agenda.module.css'

// Devuelve true si la fecha es sábado (6) o domingo (0)
function esFindeSemana(fecha) {
  const dia = fecha.getDay()
  return dia === 0 || dia === 6
}

// Calcula el offset al próximo día hábil (lunes si hoy es finde)
function offsetAlProximoDiaHabil() {
  const hoy = new Date()
  const dia = hoy.getDay()
  if (dia === 6) return 2  // sábado → lunes
  if (dia === 0) return 1  // domingo → lunes
  return 0
}

// Avanza o retrocede saltando fines de semana
function calcularOffsetSaltandoFinde(offsetActual, direccion) {
  let nuevoOffset = offsetActual + direccion
  const fecha = calcularDiaConOffset(nuevoOffset)
  while (esFindeSemana(fecha)) {
    nuevoOffset += direccion
    fecha.setDate(fecha.getDate() + direccion)
  }
  return nuevoOffset
}

function Agenda() {
  const navegar = useNavigate()
  const esMobile = useEsMobile()

  const [offsetSemana, setOffsetSemana] = useState(0)
  // En mobile arrancamos en el próximo día hábil (evita mostrar sábado/domingo)
  const [offsetDia, setOffsetDia] = useState(offsetAlProximoDiaHabil())

  const [clases, setClases] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [reservasDelDia, setReservasDelDia] = useState([])
  const [feriados, setFeriados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalFeriadoAbierto, setModalFeriadoAbierto] = useState(false)
  const [confirmacionFeriado, setConfirmacionFeriado] = useState(null)

  const diaActualMobile = calcularDiaConOffset(offsetDia)
  const esFinDeSemanaActual = esMobile && esFindeSemana(diaActualMobile)

  const diasSemana = esMobile
    ? [diaActualMobile]
    : obtenerDiasDeLaSemana(offsetSemana)

  // Calcula la próxima clase disponible para mostrar en el mensaje de finde
  function calcularProximaClase() {
    if (clases.length === 0) return null
    const diasOrden = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
    const hoy = new Date()
    const diaHoy = hoy.getDay() // 0=dom, 6=sab

    // Buscar el próximo día hábil con clases
    for (let i = 1; i <= 7; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() + i)
      const nombreDelDia = nombreDia(fecha)
      if (diasOrden.includes(nombreDelDia)) {
        const clasesDelDia = clases.filter(c => c.dia_semana === nombreDelDia)
        if (clasesDelDia.length > 0) {
          const primera = clasesDelDia.sort((a, b) => a.hora.localeCompare(b.hora))[0]
          return { fecha, clase: primera, nombreDia: nombreDelDia }
        }
      }
    }
    return null
  }

  useEffect(() => {
    cargarDatos()
  }, [offsetSemana, offsetDia, esMobile])

  async function cargarDatos() {
    setCargando(true)
    try {
      const fechasISO = diasSemana.map(formatearFechaISO)
      const primeraFecha = fechasISO[0]
      const ultimaFecha = fechasISO[fechasISO.length - 1]

      const [listaClases, listaInscripciones, reservas, listaFeriados] = await Promise.all([
        obtenerClases(),
        obtenerInscripcionesConClienteYClase(),
        obtenerReservasEnRango(primeraFecha, ultimaFecha),
        obtenerFeriadosEnRango(primeraFecha, ultimaFecha),
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

  // Navegar en mobile saltando fines de semana
  function navegarDia(direccion) {
    setOffsetDia(prev => calcularOffsetSaltandoFinde(prev, direccion))
  }

  const horariosUnicos = [...new Set(clases.map((c) => c.hora))].sort()
  const proximaClase = esFinDeSemanaActual ? calcularProximaClase() : null

  return (
    <Layout>
      <div className={styles.contenedorAgenda}>
        <div className={styles.encabezadoAgenda}>
          {esMobile ? (
            <>
              <button
                className={styles.botonNavegarSemana}
                onClick={() => navegarDia(-1)}
                aria-label="Día anterior"
              >
                ←
              </button>
              <h1 className={styles.tituloPagina}>
                {nombreDia(diasSemana[0])} {diasSemana[0].getDate()}/{diasSemana[0].getMonth() + 1}
              </h1>
              <button
                className={styles.botonNavegarSemana}
                onClick={() => navegarDia(1)}
                aria-label="Día siguiente"
              >
                →
              </button>
            </>
          ) : (
            <>
              <button className={styles.botonNavegarSemana} onClick={() => setOffsetSemana((s) => s - 1)}>
                 Anterior
              </button>
              <h1 className={styles.tituloPagina}>Agenda semanal</h1>
              <button className={styles.botonNavegarSemana} onClick={() => setOffsetSemana((s) => s + 1)}>
                Siguiente 
              </button>
            </>
          )}
        </div>

        {/* Mensaje finde de semana — solo mobile */}
        {esFinDeSemanaActual && (
          <div className={styles.mensajeEstudioCerrado}>
            <span className={styles.iconoCerrado}>🌿</span>
            <p className={styles.textoCerrado}>Hoy el estudio está cerrado.</p>
            {proximaClase && (
              <p className={styles.textoProximaClase}>
                La próxima clase es el{' '}
                <strong>
                  {proximaClase.nombreDia} {proximaClase.fecha.getDate()}/{proximaClase.fecha.getMonth() + 1}
                </strong>{' '}
                a las <strong>{proximaClase.clase.hora.slice(0, 5)} hs</strong>
              </p>
            )}
            <button
              className={styles.botonVerProxima}
              onClick={() => navegarDia(1)}
            >
              Ver próxima clase →
            </button>
          </div>
        )}

        {!esFinDeSemanaActual && (
          <>
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
                      return (
                        <th key={fechaISO} className={styles.encabezadoColumnaDia}>
                          {nombreDia(fecha).toUpperCase()}
                          <span className={styles.fechaChica}>
                            ({fecha.getDate()}/{fecha.getMonth() + 1}/{fecha.getFullYear()})
                          </span>
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
                        const pasada = esFechaPasada(fechaISO)

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
          </>
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
              <p className={styles.textoModal}>Elegí qué día querés inhabilitar:</p>
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
