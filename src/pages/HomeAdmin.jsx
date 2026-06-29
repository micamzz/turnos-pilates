import { useState, useEffect } from 'react'
import { formatearFechaCompleta, nombreDia, formatearFechaISO } from '../utils/fechas'
import { useNavigate } from 'react-router-dom'
import { obtenerClases } from '../services/clase'
import styles from './HomeAdmin.module.css' 
import { Layout } from '../components/layout/Layout.jsx'

function HomeAdmin() {
  const navegar = useNavigate()
  const fecha = formatearFechaCompleta()


  const [clasesHoy, setClasesHoy] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarResumenHoy() {
      try {
        const todasLasClases = await obtenerClases()
        const hoyNombre = nombreDia(new Date())
        // Filtra solo las clases cuyo día de la semana coincide con hoy
        const deHoy = todasLasClases.filter((c) => c.dia_semana === hoyNombre)
        setClasesHoy(deHoy)
      } catch (err) {
        console.error('No se pudo cargar el resumen de hoy:', err.message)
      } finally {
        setCargando(false)
      }
    }
    cargarResumenHoy()
  }, [])

  //  cálculos derivados para el resumen
  const cantidadClasesHoy = clasesHoy.length
  const totalAlumnosHoy = clasesHoy.reduce((suma, c) => suma + (c.inscriptos || 0), 0)

  return (
    <Layout>
      <div className={styles.contenedorHomeAdmin}>
        <div className={styles.bienvenida}>
          <h1 className={styles.tituloBienvenida}>Bienvenida al panel de administración</h1>
          <p className={styles.fecha}>{fecha}</p>
          <p className={styles.subtitulo}>Desde acá podés gestionar alumnos turnos y horarios del estudio.</p>
        </div>

        <div className={styles.gridAcciones}>
          <div className={styles.cardAccion} onClick={() => navegar('/agregar-cliente')}>
            <div>
              <h2 className={styles.tituloCard}>Agregar alumno</h2>
              <p className={styles.textoCard}>Registrá un nuevo cliente con sus datos y plan asignado.</p>
            </div>
          </div>

          <div className={styles.cardAccion} onClick={() => navegar('/agenda')}>

            <div>
              <h2 className={styles.tituloCard}>Reprogramar turno</h2>
              <p className={styles.textoCard}>Asigná un turno a un cliente en el horario disponible.</p>
            </div>
          </div>
        </div>

        {/* resumen de turnos del día */}
        <div className={styles.seccionTurnosHoy}>
          <div className={styles.encabezadoTurnosHoy}>
            <h2 className={styles.tituloSeccionTurnos}>Turnos de hoy</h2>
            <button className={styles.botonVerAgenda} onClick={() => navegar('/agenda')}>
              Ver agenda completa
            </button>
          </div>

          {cargando ? (
            <p className={styles.textoCargandoTurnos}>Cargando turnos de hoy...</p>
          ) : cantidadClasesHoy === 0 ? (
            <p className={styles.textoSinTurnosHoy}>Hoy no hay clases programadas.</p>
          ) : (
            <div className={styles.resumenTurnosHoy}>

              <div
                className={styles.estadisticaTurno}
                 onClick={() => navegar("/agenda")}
                style={{ cursor: "pointer" }}
              >
                <span className={styles.numeroEstadistica}>{cantidadClasesHoy}</span>
                <span className={styles.etiquetaEstadistica}>clases hoy</span>
              </div>

              <div
                className={styles.estadisticaTurno}
                onClick={() => navegar("/clientes")}
                style={{ cursor: "pointer" }}
              >
                <span className={styles.numeroEstadistica}>{totalAlumnosHoy}</span>
                <span className={styles.etiquetaEstadistica}>
                  alumnos anotados en total
                </span>
              </div>

            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default HomeAdmin