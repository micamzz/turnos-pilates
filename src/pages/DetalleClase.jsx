import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import { obtenerClases } from '../services/clase'
import { obtenerInscripcionesConClienteYClase } from '../services/inscripcion'
import {
  obtenerReservasEnRango,
  cancelarTurno,
  crearRecupero,
  obtenerCancelacionesDelMes,
  crearVisitaDePrueba,
  marcarAsistencia,
} from '../services/reserva'
import { clientesEnClaseYFecha, claseYaPaso } from '../utils/fechas'
import ModalConfirmacion from '../components/ModalConfirmacion/ModalConfirmacion.jsx'
import styles from './DetalleClase.module.css'

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
  const [modalPrueba, setModalPrueba] = useState(false)
  const [nombrePrueba, setNombrePrueba] = useState('')

  // Guarda el inscripto a cancelar, o null si no hay ningún confirm
  // pendiente. Reemplaza al window.confirm() de manejarEliminar().
  const [inscriptoACancelar, setInscriptoACancelar] = useState(null)

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

  // true si ya pasó el margen de 12hs del día siguiente a la fecha de la clase.
  const yaPaso = clase ? claseYaPaso(fecha, clase.hora) : false

  // Esta función ya no pregunta nada con window.confirm() — solo ejecuta
  // la cancelación. La pregunta la hace el ModalConfirmacion ahora.
  async function confirmarCancelacion() {
    try {
      await cancelarTurno(inscriptoACancelar.cliente_id, claseId, fecha)
      setInscriptoACancelar(null)
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

  // Marca asistencia directo, sin pasar por modal de confirmación — es una
  // acción positiva y rápida, no necesita la misma fricción que cancelar.
  async function confirmarAsistencia(persona) {
    try {
      await marcarAsistencia(persona.cliente_id, claseId, fecha)
      await cargarDatos()
    } catch (err) {
      setError('No se pudo marcar la asistencia: ' + err.message)
    }
  }

  const cuposLibres = clase ? clase.capacidad - clientesHoy.length : 0

  const [anio, mes, dia] = fecha.split('-')
  const fechaMostrar = `${dia}/${mes}/${anio}`

  return (
    <Layout>
      <div className={styles.contenedorDetalle}>
        <button className={styles.botonVolver} onClick={() => navegar('/agenda')}>
           Volver a la agenda
        </button>

        {cargando && <p>Cargando...</p>}
        {error && <p className={styles.mensajeError}>{error}</p>}

        {!cargando && clase && (
          <>
            <div className={styles.detalleEncabezado}>
              <div>
                <h1 className={styles.detalleTitulo}>Pilates</h1>
                <p className={styles.detalleSubtitulo}>
                  {clase.dia_semana} {fechaMostrar} · {clase.hora.slice(0, 5)} hs
                </p>
              </div>
              <div
                className={`${styles.badgeCuposDetalle} ${
                  cuposLibres > 0 ? styles.badgeCuposDetalleLibres : styles.badgeCuposDetalleCompleto
                }`}
              >
                {cuposLibres > 0 ? `${cuposLibres} cupos libres` : 'Cupo completo'}
              </div>
            </div>

            <div className={styles.detalleSeccion}>
              <div className={styles.detalleSeccionHeader}>
                <h2 className={styles.tituloSeccion}>
                  Inscriptos ({clientesHoy.length}/{clase.capacidad})
                </h2>
                {cuposLibres > 0 && !yaPaso && (
                  <div className={styles.botonesAgregarDetalle}>
                    <button className={styles.botonAgregarDetalle} onClick={() => setModalAgregar(true)}>
                      + Agregar cliente
                    </button>
                    <button
                      className={`${styles.botonAgregarDetalle} ${styles.botonAgregarPrueba}`}
                      onClick={() => setModalPrueba(true)}
                    >
                      + Clase de prueba
                    </button>
                  </div>
                )}
              </div>

              {clientesHoy.length === 0 ? (
                <p className={styles.detalleVacio}>No hay nadie inscripto en esta clase.</p>
              ) : (
                <ul className={styles.listaInscriptos}>
                  {clientesHoy.map((i) => (
                    <li key={i.id} className={styles.itemInscripto}>
                      <div className={styles.inscriptoInfo}>
                        <span className={styles.inscriptoNombre}>
                          {i.clientes?.nombre} {i.clientes?.apellido}
                        </span>
                        {i.esRecupero && <span className={styles.etiquetaRecupero}>Recupero</span>}
                        {i.esPrueba && <span className={styles.etiquetaPrueba}>Prueba</span>}
                        {i.asistio && <span className={styles.etiquetaAsistio}>Asistió</span>}
                      </div>

                      <div className={styles.accionesInscripto}>
                        {!i.asistio && !yaPaso && (
                          <button
                            className={styles.botonConfirmarAsistencia}
                            onClick={() => confirmarAsistencia(i)}
                          >
                            Confirmar asistencia
                          </button>
                        )}
                        <button
                          className={styles.botonEliminarInscripto}
                          onClick={() => setInscriptoACancelar(i)}
                          disabled={yaPaso}
                        >
                          Cancelar turno
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Modal agregar cliente (recupero) */}
        {modalAgregar && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button className={styles.botonCerrarModal} onClick={() => setModalAgregar(false)} aria-label="Cerrar">
                ✕
              </button>

              <h2 className={styles.tituloModal}>Agregar cliente</h2>
              <p className={styles.textoModal}>Clientes con cancelaciones pendientes este mes:</p>

              {cancelacionesDelMes.length === 0 ? (
                <p className={styles.detalleVacio}>No hay cancelaciones pendientes este mes.</p>
              ) : (
                <ul className={styles.listaDiasModal}>
                  {cancelacionesDelMes.map((c) => (
                    <li key={c.id} className={styles.itemDiaModal}>
                      <span>
                        {c.clientes?.nombre} {c.clientes?.apellido}
                        <span className={styles.fechaCancelacion}> — canceló el {c.fecha}</span>
                      </span>
                      <button className={styles.botonHabilitar} onClick={() => manejarAgregarRecupero(c)}>
                        Asignar acá
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className={styles.accionesModal}>
                <button className={styles.botonSecundario} onClick={() => setModalAgregar(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Clase de prueba */}
        {modalPrueba && (
          <div className={styles.overlayModal}>
            <div className={styles.modal}>
              <button
                className={styles.botonCerrarModal}
                onClick={() => {
                  setModalPrueba(false)
                  setNombrePrueba('')
                }}
                aria-label="Cerrar"
              >
                ✕
              </button>

              <h2 className={styles.tituloModal}>Clase de prueba</h2>
              <p className={styles.textoModal}>
                Anotá a alguien que viene a probar, sin necesidad de registrarlo como cliente:
              </p>

              <label className={styles.etiquetaModal}>Nombre</label>
              <input
                type="text"
                className={styles.campoTextoModal}
                value={nombrePrueba}
                onChange={(e) => setNombrePrueba(e.target.value)}
                placeholder="Nombre y apellido"
              />

              <div className={styles.accionesModal}>
                <button
                  className={styles.botonSecundario}
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

        {/* Modal nuevo, reemplaza al window.confirm() de manejarEliminar() */}
        {inscriptoACancelar && (
          <ModalConfirmacion
            mensaje={`¿Cancelar el turno de ${inscriptoACancelar.clientes?.nombre || 'este cliente'} para este día?`}
            alConfirmar={confirmarCancelacion}
            alCancelar={() => setInscriptoACancelar(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default DetalleClase