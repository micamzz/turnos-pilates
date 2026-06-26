import styles from './ModalConfirmacion.module.css'

// - mensaje: el texto de la pregunta 
// - alConfirmar: función que se ejecuta si el usuario confirma
// - alCancelar: función que se ejecuta si el usuario cancela o cierra con la X
function ModalConfirmacion({ mensaje, alConfirmar, alCancelar }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.botonCerrar} onClick={alCancelar} aria-label="Cerrar">
          ✕
        </button>

        <p className={styles.mensaje}>{mensaje}</p>

        <div className={styles.acciones}>
          <button className={styles.botonSecundario} onClick={alCancelar}>
            Cancelar
          </button>
          <button className={styles.botonPrincipal} onClick={alConfirmar}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmacion