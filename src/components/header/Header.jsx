import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../config/supabase'
import logoPilates from '../../assets/logo-header.png'
import styles from './Header.module.css'
import ModalConfirmacion from '../ModalConfirmacion/ModalConfirmacion.jsx'

function Header() {
  const navegar = useNavigate()

  const [modalCerrarSesionAbierto, setModalCerrarSesionAbierto] = useState(false)

  // Estado para controlar si el menú hamburguesa está abierto o cerrado
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Función para cerrar sesión, que se ejecuta si el usuario confirma en el modal
  async function cerrarSesion() {
    await supabase.auth.signOut()
    navegar('/')
  }

  return (
    <header className={styles.header}>
      <Link to="/home">
        <img
          src={logoPilates}
          alt="Aquí y Ahora - Estudio de Pilates"
          className={styles.logo}
        />
      </Link>

      {/* Botón hamburguesa (solo se mostrará en celular mediante CSS) */}
      <button
        className={styles.hamburguesa}
        onClick={() => setMenuAbierto(!menuAbierto)}
      >
        ☰
      </button>

      {/* Menú de navegación */}
      <nav
        className={`${styles.nav} ${
          menuAbierto ? styles.navAbierto : ''
        }`}
      >
        <Link
          to="/home"
          className={styles.navLink}
          onClick={() => setMenuAbierto(false)}
        >
          Inicio
        </Link>

        <Link
          to="/agenda"
          className={styles.navLink}
          onClick={() => setMenuAbierto(false)}
        >
          Turnos
        </Link>

        <Link
          to="/clientes"
          className={styles.navLink}
          onClick={() => setMenuAbierto(false)}
        >
          Alumnos
        </Link>

        {/* El botón abre el modal para luego confirmar si quiere cerrar sesión o no */}
        <button
          onClick={() => {
            setModalCerrarSesionAbierto(true)
            setMenuAbierto(false)
          }}
          className={styles.botonCerrarSesion}
        >
          Cerrar sesión
        </button>
      </nav>

      {/* Mensaje del modal para cerrar sesión */}
      {modalCerrarSesionAbierto && (
        <ModalConfirmacion
          mensaje="¿Seguro que querés cerrar sesión?"
          alConfirmar={cerrarSesion}
          alCancelar={() => setModalCerrarSesionAbierto(false)}
        />
      )}
    </header>
  )
}

export default Header