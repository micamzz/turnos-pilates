import styles from './ModalConfirmacion.module.css'


/* mensaje: el texto de la pregunta o aviso
 alConfirmar: función que se ejecuta al apretar el botón principal
 alCancelar: OPCIONAL. Si se pasa, el modal muestra 2 botones (Cancelar
 y Confirmar), como una pregunta normal. Si NO se pasa, el modal
entiende que es un simple aviso, y muestra un solo botón (ej. "Aceptar").
textoBoton: OPCIONAL. Texto del botón único cuando no hay alCancelar.
 Por defecto dice "Aceptar".  */
function ModalConfirmacion({ mensaje, alConfirmar, alCancelar, textoBoton = 'Aceptar' }) {
  const esSoloAviso = !alCancelar 

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/*la X de cerrar usa alCancelar si existe, o alConfirmar
            si es un aviso (porque ahí "cerrar" y "confirmar" son lo mismo) */}
        <button className={styles.botonCerrar} onClick={alCancelar || alConfirmar} aria-label="Cerrar">
          ✕
        </button>

        <p className={styles.mensaje}>{mensaje}</p>

        <div className={styles.acciones}>
          {/*el botón "Cancelar" solo se muestra si NO es un aviso */}
          {!esSoloAviso && (
            <button className={styles.botonSecundario} onClick={alCancelar}>
              Cancelar
            </button>
          )}
          <button className={styles.botonPrincipal} onClick={alConfirmar}>
            {/*el botón "Confirmar" solo se muestra si NO es un aviso */}
            {esSoloAviso ? textoBoton : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalConfirmacion