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
