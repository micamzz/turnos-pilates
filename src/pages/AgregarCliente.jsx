import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerPlanes } from "../services/planes"
import { obtenerClases } from '../services/clase'
import { crearCliente } from '../services/clientes'
import { crearInscripciones } from '../services/inscripcion'
import './AgregarCliente.css'

function AgregarCliente() {
    const [nombre, setNombre] = useState('')
    const [telefono, setTelefono] = useState('')
    const [email, setEmail] = useState('')
    const [planId, setPlanId] = useState('')
    const [clasesSeleccionadas, setClasesSeleccionadas] = useState([])

    const [planes, setPlanes] = useState([])
    const [clases, setClases] = useState([])

    const [cargando, setCargando] = useState(false)
    const [errores, setErrores] = useState({})
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

        if (!telefono.trim()) {
            nuevosErrores.telefono = 'El teléfono es obligatorio'
        }

        if (clasesSeleccionadas.length === 0) {
            nuevosErrores.clases = 'Debes seleccionar un plan para poder registrar un nuevo cliente'
        }

        setErrores(nuevosErrores)

        if (Object.keys(nuevosErrores).length > 0) {
            return
        }

        setCargando(true)
        try {
            const clienteCreado = await crearCliente({
                nombre,
                telefono,
                email,
                plan_id: planId || null,
            })

            const inscripciones = clasesSeleccionadas.map((claseId) => ({
                cliente_id: clienteCreado.id,
                clase_id: claseId,
            }))
            await crearInscripciones(inscripciones)

            navegar('/landing')
        } catch (err) {
            setErrores({ general: 'No se pudo guardar el cliente: ' + err.message })
        } finally {
            setCargando(false)
        }
    }

    const diasOrdenados = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
    const clasesPorDia = diasOrdenados.map((dia) => ({
        dia,
        clases: clases.filter((c) => c.dia_semana === dia),
    }))

    return (
        <div className="contenedor-agregar-cliente">
            <h1>Agregar Cliente</h1>

            <form onSubmit={manejarEnvio}>
                <div className="seccion-form">
                    <h2 className="titulo-seccion">Datos del cliente</h2>
                    <div className="fila-campos">
                        <div className="grupo-entrada">
                            <label>Nombre</label>
                            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
                            {errores.nombre && <p className="mensaje-error">{errores.nombre}</p>}
                        </div>

                        <div className="grupo-entrada">
                            <label>Teléfono</label>
                            <input
                                type="tel"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value.replace(/[^0-9]/g, ''))}
                                maxLength={15}
                            />
                            {errores.telefono && <p className="mensaje-error">{errores.telefono}</p>}
                        </div>
                    </div>

                    <div className="grupo-entrada">
                        <label>Email <span className="opcional">(opcional)</span></label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                </div> {/* fin seccion-form */}

                <div className="separador" />
                <div className="seccion-form">
                    <h2 className="titulo-seccion">Plan</h2>
                    <div className="grupo-entrada">
                        <select
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
                </div> {/* fin seccion-form */}

                <div className="separador" />

                <div className="seccion-form">
                    <h2 className="titulo-seccion">Días y horarios fijos</h2>

                    {!planSeleccionado && (
                        <p className="ayuda-plan">Primero seleccioná un plan para poder elegir días</p>
                    )}

                    {planSeleccionado && (
                        <p className="ayuda-plan">
                            Seleccionaste <strong>{clasesSeleccionadas.length}</strong> de <strong>{maximoClases}</strong> día(s) permitidos
                        </p>
                    )}

                    {errores.clases && <p className="mensaje-error">{errores.clases}</p>}

                    {planSeleccionado &&
                        clasesPorDia.map(({ dia, clases: clasesDelDia }) => (
                            <div key={dia} className="grupo-dia">
                                <strong>{dia}</strong>
                                <div className="lista-horarios">
                                    {clasesDelDia.map((clase) => {
                                        const estaSeleccionada = clasesSeleccionadas.includes(clase.id)
                                        const deshabilitado =
                                            !estaSeleccionada && maximoClases && clasesSeleccionadas.length >= maximoClases

                                        return (
                                            <label
                                                key={clase.id}
                                                className={`opcion-horario${deshabilitado ? ' deshabilitado' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={estaSeleccionada}
                                                    disabled={deshabilitado}
                                                    onChange={() => alternarClase(clase.id)}
                                                />
                                                {clase.hora.slice(0, 5)}
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                </div> {/* fin seccion-form */}

                <button type="submit" disabled={cargando}>
                    {cargando ? 'Guardando...' : 'Guardar Cliente'}
                </button>

                {errores.general && <p className="mensaje-error">{errores.general}</p>}
            </form>
        </div>
    )
}

export default AgregarCliente