import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import logoPilates from '../../assets/logo-pilates.svg'
import styles from './Header.module.css'

function Header() {
  const navegar = useNavigate()

  async function manejarCerrarSesion() {
    // AGREGADO: pide confirmación antes de cerrar sesión
    const confirmado = window.confirm('¿Seguro que querés cerrar sesión?')
    if (!confirmado) return

    await supabase.auth.signOut()
    navegar('/')
  }

  return (
    <header className={styles.header}>
      <img src={logoPilates} alt="Aquí y Ahora - Estudio de Pilates" className={styles.logo} />

      <nav className={styles.nav}>
        <Link to="/agenda" className={styles.navLink}>Turnos</Link>
      <Link to="/clientes" className={styles.navLink}>Clientes</Link>
        <button onClick={manejarCerrarSesion} className={styles.botonCerrarSesion}>
          Cerrar sesión
        </button>
      </nav>
    </header>
  )
}

export default Header