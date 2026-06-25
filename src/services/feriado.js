import { supabase } from '../config/supabase'

// Trae los feriados que caen dentro de un rango de fechas (la semana visible en la Agenda)
export async function obtenerFeriadosEnRango(fechaInicio, fechaFin) {
  const { data, error } = await supabase
    .from('feriado')
    .select('*')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

  if (error) throw error
  return data
}

// Marca una fecha puntual como feriado (inhabilita ese día completo)
export async function crearFeriado(fecha, motivo = null) {
  const { data, error } = await supabase
    .from('feriado')
    .insert({ fecha, motivo })
    .select()
    .single()

  if (error) throw error
  return data
}

// Quita el feriado de una fecha (vuelve a habilitar el día)
export async function eliminarFeriado(fecha) {
  const { error } = await supabase
    .from('feriado')
    .delete()
    .eq('fecha', fecha)

  if (error) throw error
}