import { supabase } from '../config/supabase'

// Crear un cliente nuevo(objeto)
export async function crearCliente(datosCliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert(datosCliente)
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualiza un cliente existente
export async function actualizarCliente(id, datosCliente) {
  const { data, error } = await supabase
    .from('clientes')
    .update(datosCliente)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Elimina un cliente (por on delete cascade, también borra sus inscripciones)
export async function eliminarCliente(id) {
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Obtener todos los clientes
export async function obtenerClientes(){
    const {data,error} = await supabase
    .from('clientes')
    .select('*, planes(nombre, cantidad_clases)')
    .order('nombre')

      if (error) throw error
  return data
}

// Obtener un cliente por id
export async function obtenerClientePorId(id){
    const {data,error} = await supabase
    .from('clientes')
    .select('*, planes(nombre, cantidad_clases)')
    .eq('id', id)
    .single()      

      if (error) throw error
  return data
 }

 // Trae todos los clientes con su plan y sus inscripciones (clase + día + hora)
export async function obtenerClientesConInscripciones() {
  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      planes(nombre, cantidad_clases),
      inscripcion(
        id,
        activa,
        clase_id,
        clase(dia_semana, hora)
      )
    `)
    .order('nombre')

  if (error) throw error
  return data
}

// Marca un cliente como inactivo (dar de baja, sin borrar su historial)
export async function darDeBajaCliente(id) {
  const { data, error } = await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function reactivarCliente(id, planId) {
  const { data, error } = await supabase
    .from('clientes')
    .update({ activo: true, plan_id: planId })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}