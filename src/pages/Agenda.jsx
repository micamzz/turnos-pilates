import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasEnRango } from '../services/reserva'
import { obtenerFeriadosEnRango, crearFeriado, eliminarFeriado } from '../services/feriado'
import { obtenerDiasDeLaSemana,formatearFechaISO,nombreDia,esFechaPasada, clientesEnClaseYFecha, } from '../utils/fechas'
import './Agenda.css'

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


  function cantidadInscriptos(claseId, fechaISO) {
    const inscripcionesDeLaClase = inscripciones.filter((i) => i.clase_id === claseId)
    return clientesEnClaseYFecha(inscripcionesDeLaClase, reservasDelDia, claseId, fechaISO).length
  }

  const horariosUnicos = [...new Set(clases.map((c) => c.hora))].sort()

  return (
    <Layout>
      <div className="contenedor-agenda">
        <div className="encabezado-agenda">
          <button onClick={() => setOffsetSemana((s) => s - 1)}> Anterior</button>
          <h1>Agenda semanal</h1>
          <button onClick={() => setOffsetSemana((s) => s + 1)}>Siguiente </button>
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
             
                {diasSemana.map((fecha) => {
                  const fechaISO = formatearFechaISO(fecha)
                  return (
                    <th key={fechaISO}>
                      {nombreDia(fecha).toUpperCase()}
                      <span className="fecha-chica">
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
                        <td key={fechaISO} className="celda-feriado">
                          <div className="celda-feriado-inner">Feriado</div>
                        </td>
                      )
                    }

                    if (!clase) {
                      return <td key={fechaISO} className="celda-vacia" />
                    }

                    const totalInscriptos = cantidadInscriptos(clase.id, fechaISO)
                    const cuposLibres = clase.capacidad - totalInscriptos
                    const pasada = esFechaPasada(fechaISO)

                    return (
                      <td key={fechaISO} className="celda-turno">
                        <div
                          className={`tarjeta-clase ${pasada ? 'tarjeta-pasada' : 'tarjeta-clickeable'}`}
                          onClick={() => navegar(`/agenda/${clase.id}/${fechaISO}`)}
                        >
                          <div className="hora-clase">{hora.slice(0, 5)} hs</div>
                          <div className="fila-cupos">
                            <span className={`badge-cupos ${cuposLibres > 0 ? 'libres' : 'completo'}`}>
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