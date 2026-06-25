import { supabase } from '../config/supabase'

export async function obtenerClases() {
  const { data, error } = await supabase
    .from('clase')
    .select('*')
    .order('dia_orden')
    .order('hora')

  if (error) throw error
  return data
}