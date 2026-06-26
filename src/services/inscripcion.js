import { supabase } from '../config/supabase'

// Trae las inscripciones de un cliente puntual (con datos de la clase incluidos)
export async function obtenerInscripcionesPorCliente(clienteId) {
  const { data, error } = await supabase
    .from('inscripcion')
    .select('*, clase(dia_semana, hora, nombre)')
    .eq('cliente_id', clienteId)
    .eq('activa', true)

  if (error) throw error
  return data
}

// Trae todas las inscripciones activas con su cliente y clase (para armar la grilla completa)
export async function obtenerInscripcionesConClienteYClase() {
  const { data, error } = await supabase
    .from('inscripcion')
    .select('id, cliente_id, clase_id, clientes(nombre, apellido), clase(dia_semana, hora)')
    .eq('activa', true)

  if (error) throw error
  return data
}

// Crea una inscripción (cliente fijo en una clase). Recibe { cliente_id, clase_id }
export async function crearInscripcion(datosInscripcion) {
  const { data, error } = await supabase
    .from('inscripcion')
    .insert(datosInscripcion)
    .select()
    .single()

  if (error) throw error
  return data
}

// Crea varias inscripciones de una sola vez (cuando el cliente elige 2 o 3 días)
export async function crearInscripciones(listaInscripciones) {
  const { data, error } = await supabase
    .from('inscripcion')
    .insert(listaInscripciones)
    .select()

  if (error) throw error
  return data
}

// Da de baja una inscripción puntual
export async function desactivarInscripcion(id) {
  const { data, error } = await supabase
    .from('inscripcion')
    .update({ activa: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/*  Desactiva todas las inscripciones activas de un cliente de una sola vez.
Cuando se da de baja al cliente, libera sus cupos de la agenda  */
export async function desactivarInscripcionesDeCliente(clienteId) {
  const { error } = await supabase
    .from('inscripcion')
    .update({ activa: false })
    .eq('cliente_id', clienteId)
    .eq('activa', true)

  if (error) throw error
}

// Reprograma una inscripción: desactiva la vieja y crea una nueva con la clase elegida
export async function reprogramarInscripcion(inscripcionId, clienteId, nuevaClaseId) {
   await desactivarInscripcion(inscripcionId)

  return  crearInscripcion({ cliente_id: clienteId,clase_id: nuevaClaseId,})
}