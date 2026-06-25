import { supabase } from '../config/supabase'

// Trae todos los planes disponibles (4, 8 y 12 clases)
export async function obtenerPlanes() {
  const { data, error } = await supabase
    .from('planes')
    .select('*')
    .order('cantidad_clases')

  if (error) throw error
  return data
}