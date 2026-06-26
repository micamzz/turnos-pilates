import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import { obtenerReservasEnRango, cancelarTurno, crearRecupero, obtenerCancelacionesDelMes, crearVisitaDePrueba, } from '../services/reserva'
import { clientesEnClaseYFecha } from '../utils/fechas'
import './DetalleClase.css'

function DetalleClase() {
  const { claseId, fecha } = useParams()
  const navegar = useNavigate()

  const [clase, setClase] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [reservas, setReservas] = useState([])
  const [cancelacionesDelMes, setCancelacionesDelMes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modalAgregar, setModalAgregar] = useState(false)

  // nuevo estado para el modal de visita de prueba
  const [modalPrueba, setModalPrueba] = useState(false)
  const [nombrePrueba, setNombrePrueba] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [claseId, fecha])

  async function cargarDatos() {
    setCargando(true)
    try {
      const [clases, todasInscripciones, reservasDelDia, cancelaciones] = await Promise.all([
        obtenerClases(),
        obtenerInscripcionesConClienteYClase(),
        obtenerReservasEnRango(fecha, fecha),
        obtenerCancelacionesDelMes(fecha),
      ])

      const claseEncontrada = clases.find((c) => String(c.id) === String(claseId))
      setClase(claseEncontrada)
      setInscripciones(todasInscripciones.filter((i) => String(i.clase_id) === String(claseId)))
      setReservas(reservasDelDia)
      setCancelacionesDelMes(cancelaciones)
    } catch (err) {
      setError('No se pudieron cargar los datos: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  const clientesHoy = clientesEnClaseYFecha(inscripciones, reservas, claseId, fecha)

  async function manejarEliminar(inscripto) {
    const nombre = inscripto.clientes?.nombre || 'este cliente'
    const confirmado = window.confirm(`¿Cancelar el turno de ${nombre} para este día?`)
    if (!confirmado) return

    try {
      await cancelarTurno(inscripto.cliente_id, claseId, fecha)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo cancelar: ' + err.message)
    }
  }

  async function manejarAgregarRecupero(cancelacion) {
    try {
      await crearRecupero(cancelacion.cliente_id, claseId, fecha)
      setModalAgregar(false)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo agregar: ' + err.message)
    }
  }

  // Confirma la visita de prueba con el nombre tipeado.
  async function confirmarVisitaDePrueba() {
    if (!nombrePrueba.trim()) {
      setError('Ingresá el nombre de la persona')
      return
    }
    try {
      await crearVisitaDePrueba(nombrePrueba.trim(), claseId, fecha)
      setModalPrueba(false)
      setNombrePrueba('')
      await cargarDatos()
    } catch (err) {
      setError('No se pudo agregar la visita de prueba: ' + err.message)
    }
  }

  const cuposLibres = clase ? clase.capacidad - clientesHoy.length : 0

  const [anio, mes, dia] = fecha.split('-')
  const fechaMostrar = `${dia}/${mes}/${anio}`

  return (
    <Layout>
      <div className="contenedor-detalle">
        <button className="boton-volver" onClick={() => navegar('/agenda')}>
          ← Volver a la agenda
        </button>

        {cargando && <p>Cargando...</p>}
        {error && <p className="mensaje-error">{error}</p>}

        {!cargando && clase && (
          <>
            <div className="detalle-encabezado">
              <div>
                <h1 className="detalle-titulo">Pilates</h1>
                <p className="detalle-subtitulo">
                  {clase.dia_semana} {fechaMostrar} · {clase.hora.slice(0, 5)} hs
                </p>
              </div>
              <div className={`badge-cupos-detalle ${cuposLibres > 0 ? 'libres' : 'completo'}`}>
                {cuposLibres > 0 ? `${cuposLibres} cupos libres` : 'Cupo completo'}
              </div>
            </div>

            <div className="detalle-seccion">
              <div className="detalle-seccion-header">
                <h2>Inscriptos ({clientesHoy.length}/{clase.capacidad})</h2>
                {/* hay 2 botones cuando hay cupo: Agregar cliente(recupero) y Agregar prueba (visita nueva sin registro) */}
                {cuposLibres > 0 && (
                  <div className="botones-agregar-detalle">
                    <button className="boton-agregar-detalle" onClick={() => setModalAgregar(true)}>
                      + Agregar cliente
                    </button>
                    <button className="boton-agregar-detalle boton-agregar-prueba" onClick={() => setModalPrueba(true)}>
                      + Clase de prueba
                    </button>
                  </div>
                )}
              </div>

              {clientesHoy.length === 0 ? (
                <p className="detalle-vacio">No hay nadie inscripto en esta clase.</p>
              ) : (
                <ul className="lista-inscriptos">
                  {clientesHoy.map((i) => (
                    <li key={i.id} className="item-inscripto">
                      <div className="inscripto-info">
                        <span className="inscripto-nombre">
                          {i.clientes?.nombre} {i.clientes?.apellido}
                        </span>
                        {i.esRecupero && <span className="etiqueta-recupero">Recupero</span>}
                        {/* etiqueta nueva para distinguir visitas de prueba */}
                        {i.esPrueba && <span className="etiqueta-prueba">Prueba</span>}
                      </div>
                      <button className="boton-eliminar-inscripto" onClick={() => manejarEliminar(i)}>
                        Cancelar turno
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Modal agregar cliente (recupero) */}
        {modalAgregar && (
          <div className="overlay-modal">
            <div className="modal">
              <button className="boton-cerrar-modal" onClick={() => setModalAgregar(false)} aria-label="Cerrar">
                ✕
              </button>

              <h2>Agregar cliente</h2>
              <p>Clientes con cancelaciones pendientes este mes:</p>

              {cancelacionesDelMes.length === 0 ? (
                <p className="detalle-vacio">No hay cancelaciones pendientes este mes.</p>
              ) : (
                <ul className="lista-dias-modal">
                  {cancelacionesDelMes.map((c) => (
                    <li key={c.id} className="item-dia-modal">
                      <span>
                        {c.clientes?.nombre} {c.clientes?.apellido}
                        <span className="fecha-cancelacion"> — canceló el {c.fecha}</span>
                      </span>
                      <button className="boton-habilitar" onClick={() => manejarAgregarRecupero(c)}>
                        Asignar acá
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="acciones-modal">
                <button className="boton-secundario" onClick={() => setModalAgregar(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  modal nuevo para la visita de prueba */}
        {modalPrueba && (
          <div className="overlay-modal">
            <div className="modal">
              <button className="boton-cerrar-modal" onClick={() => setModalPrueba(false)} aria-label="Cerrar">
                ✕
              </button>

              <h2>Clase de prueba</h2>
              <p>Anotá a alguien que viene a probar, sin necesidad de registrarlo como cliente:</p>

              <label>Nombre</label>
              <input
                type="text"
                value={nombrePrueba}
                onChange={(e) => setNombrePrueba(e.target.value)}
                placeholder="Nombre y apellido"
              />

              <div className="acciones-modal">
                <button
                  className="boton-secundario"
                  onClick={() => {
                    setModalPrueba(false)
                    setNombrePrueba('')
                  }}
                >
                  Cancelar
                </button>
                <button onClick={confirmarVisitaDePrueba}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default DetalleClase