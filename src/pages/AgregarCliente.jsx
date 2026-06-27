import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout.jsx'
import { useNavigate } from 'react-router-dom'
import { obtenerPlanes } from '../services/planes'
import { obtenerClases, verificarCupoDisponible } from '../services/clase'
import { crearCliente } from '../services/clientes'
import { crearInscripciones } from '../services/inscripcion'
import ModalConfirmacion from '../components/ModalConfirmacion/ModalConfirmacion.jsx'
import styles from './AgregarCliente.module.css'
import { agruparClasesPorDia } from '../utils/fechas'

function AgregarCliente() {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [planId, setPlanId] = useState('')
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState([])

  const [planes, setPlanes] = useState([])
  const [clases, setClases] = useState([])

  const [cargando, setCargando] = useState(false)
  const [errores, setErrores] = useState({})
  const [clienteCreadoExitoso, setClienteCreadoExitoso] = useState(null)
  const navegar = useNavigate()

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [listaPlanes, listaClases] = await Promise.all([
          obtenerPlanes(),
          obtenerClases(),
        ])
        setPlanes(listaPlanes)
        setClases(listaClases)
      } catch (err) {
        setErrores({ general: 'No se pudieron cargar los datos: ' + err.message })
      }
    }
    cargarDatos()
  }, [])

  const planSeleccionado = planes.find((p) => p.id === planId)
  const maximoClases = planSeleccionado ? planSeleccionado.cantidad_clases / 4 : null

  function alternarClase(claseId) {
    setClasesSeleccionadas((actual) => {
      const yaEstaElegida = actual.includes(claseId)

      if (yaEstaElegida) {
        return actual.filter((id) => id !== claseId)
      }

      if (maximoClases && actual.length >= maximoClases) {
        setErrores((prev) => ({
          ...prev,
          clases: `Este plan permite hasta ${maximoClases} día(s) por semana`,
        }))
        return actual
      }

      setErrores((prev) => ({ ...prev, clases: undefined }))
      return [...actual, claseId]
    })
  }

  async function manejarEnvio(e) {
    e.preventDefault()

    const nuevosErrores = {}

    if (!nombre.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio'
    }
    if (!apellido.trim()) {
      nuevosErrores.apellido = 'El apellido es obligatorio'
    }
    if (!telefono.trim()) {
      nuevosErrores.telefono = 'El teléfono es obligatorio'
    }
    if (!planId) {
      nuevosErrores.plan = 'Seleccioná un plan'
    }
    if (clasesSeleccionadas.length === 0) {
      nuevosErrores.clases = 'Seleccioná al menos un día y horario'
    }

    setErrores(nuevosErrores)

    if (Object.keys(nuevosErrores).length > 0) {
      return
    }

    setCargando(true)
    try {
      // CAMBIO: revalidación real de cupo contra la base, justo antes de
      // crear el cliente. Evita que 2 altas simultáneas sobrecarguen la
      // misma clase, ya que el cupo mostrado en pantalla pudo quedar viejo
      // mientras la dueña completaba el formulario.
      for (const claseId of clasesSeleccionadas) {
        const hayCupo = await verificarCupoDisponible(claseId)
        if (!hayCupo) {
          const clase = clases.find((c) => c.id === claseId)
          setErrores({
            general: `La clase de ${clase?.dia_semana} ${clase?.hora.slice(0, 5)} ya no tiene cupo disponible`,
          })
          setCargando(false)
          return
        }
      }

      const clienteCreado = await crearCliente({
        nombre,
        apellido,
        telefono,
        email,
        plan_id: planId || null,
      })

      const inscripciones = clasesSeleccionadas.map((claseId) => ({
        cliente_id: clienteCreado.id,
        clase_id: claseId,
      }))
      await crearInscripciones(inscripciones)

      setClienteCreadoExitoso({ nombre, apellido })
    } catch (err) {
      setErrores({ general: 'No se pudo guardar el cliente: ' + err.message })
    } finally {
      setCargando(false)
    }
  }

  function irALaAgenda() {
    setClienteCreadoExitoso(null)
    navegar('/agenda')
  }

  const clasesPorDia = agruparClasesPorDia(clases)

  return (
    <Layout>
      <div className={styles.contenedorAgregarCliente}>
        <h1 className={styles.tituloPagina}>Agregar Cliente</h1>

        <form onSubmit={manejarEnvio} className={styles.formularioCliente}>
          <div className={styles.seccionForm}>
            <h2 className={styles.tituloSeccion}>Datos del cliente</h2>
            <div className={styles.filaCampos}>
              <div className={styles.grupoEntrada}>
                <label className={styles.etiquetaCampo}>Nombre</label>
                <input className={styles.entradaTexto} value={nombre} onChange={(e) => setNombre(e.target.value)} />
                {errores.nombre && <p className={styles.mensajeError}>{errores.nombre}</p>}
              </div>

              <div className={styles.grupoEntrada}>
                <label className={styles.etiquetaCampo}>Apellido</label>
                <input
                  type="text"
                  className={styles.entradaTexto}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
                {errores.apellido && <p className={styles.mensajeError}>{errores.apellido}</p>}
              </div>

              <div className={styles.grupoEntrada}>
                <label className={styles.etiquetaCampo}>Teléfono</label>
                <input
                  type="tel"
                  className={styles.entradaTexto}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={15}
                />
                {errores.telefono && <p className={styles.mensajeError}>{errores.telefono}</p>}
              </div>
            </div>

            <div className={styles.grupoEntrada}>
              <label className={styles.etiquetaCampo}>
                Email <span className={styles.opcional}>(opcional)</span>
              </label>
              <input type="email" className={styles.entradaTexto} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className={styles.separador} />

          <div className={styles.seccionForm}>
            <h2 className={styles.tituloSeccion}>Plan</h2>
            <div className={styles.grupoEntrada}>
              <select
                className={styles.entradaSelect}
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value)
                  setClasesSeleccionadas([])
                  setErrores((prev) => ({ ...prev, clases: undefined }))
                }}
              >
                <option value="">Seleccionar plan</option>
                {planes.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.nombre} ({plan.cantidad_clases} clases/mes)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.separador} />

          <div className={styles.seccionForm}>
            <h2 className={styles.tituloSeccion}>Días y horarios fijos</h2>

            {!planSeleccionado && (
              <p className={styles.ayudaPlan}>Primero seleccioná un plan para poder elegir días</p>
            )}

            {planSeleccionado && (
              <p className={styles.ayudaPlan}>
                Seleccionaste <strong>{clasesSeleccionadas.length}</strong> de <strong>{maximoClases}</strong> día(s) permitidos
              </p>
            )}

            {errores.clases && <p className={styles.mensajeError}>{errores.clases}</p>}

            {planSeleccionado &&
              clasesPorDia.map(({ dia, clases: clasesDelDia }) => (
                <div key={dia} className={styles.grupoDia}>
                  <strong className={styles.nombreDia}>{dia}</strong>
                  <div className={styles.listaHorarios}>
                    {clasesDelDia.map((clase) => {
                      const estaSeleccionada = clasesSeleccionadas.includes(clase.id)
                      const sinCupos = clase.cuposDisponibles <= 0
                      const deshabilitado =
                        sinCupos ||
                        (!estaSeleccionada && maximoClases && clasesSeleccionadas.length >= maximoClases)

                      return (
                        <label
                          key={clase.id}
                          className={`${styles.opcionHorario}${deshabilitado ? ` ${styles.deshabilitado}` : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={estaSeleccionada}
                            disabled={deshabilitado}
                            onChange={() => alternarClase(clase.id)}
                          />
                          {clase.cuposDisponibles > 0
                            ? `${clase.hora.slice(0, 5)} - ${clase.cuposDisponibles} cupos disponibles`
                            : `${clase.hora.slice(0, 5)} - COMPLETO`}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>

          <button type="submit" disabled={cargando} className={styles.botonGuardar}>
            {cargando ? 'Guardando...' : 'Guardar Cliente'}
          </button>

          {errores.general && <p className={styles.mensajeError}>{errores.general}</p>}
        </form>

        {clienteCreadoExitoso && (
          <ModalConfirmacion
            mensaje={`${clienteCreadoExitoso.nombre} ${clienteCreadoExitoso.apellido} fue agregado correctamente.`}
            alConfirmar={irALaAgenda}
            textoBoton="Ir a la agenda"
          />
        )}
      </div>
    </Layout>
  )
}

export default AgregarCliente