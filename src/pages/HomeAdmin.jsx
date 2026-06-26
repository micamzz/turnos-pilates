import { formatearFechaCompleta } from '../utils/fechas'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout.jsx'
import styles from './HomeAdmin.module.css'

function HomeAdmin() {
  const navegar = useNavigate()
  const fecha = formatearFechaCompleta()

  return (
    <Layout>
      <div className={styles.contenedorHomeAdmin}>
        <div className={styles.bienvenida}>
          <h1 className={styles.tituloBienvenida}>Bienvenida al panel de administración</h1>
          <p className={styles.fecha}>{fecha}</p>
          <p className={styles.subtitulo}>Desde acá podés gestionar clientes, turnos y horarios del estudio.</p>
        </div>

        <div className={styles.gridAcciones}>
          <div className={styles.cardAccion} onClick={() => navegar('/agregar-cliente')}>
            <div>
              <h2 className={styles.tituloCard}>Agregar cliente</h2>
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
      </div>
    </Layout>
  )
}

export default HomeAdmin