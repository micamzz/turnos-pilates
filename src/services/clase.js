import { supabase } from '../config/supabase'

export async function obtenerClases() {
  const { data, error } = await supabase
    .from('clase')
    .select(` *, inscripcion( id, activa ) `)
    .order('dia_orden')
    .order('hora')

  if (error) throw error

  return data.map((clase) => {
    const inscriptos =
      clase.inscripcion?.filter((i) => i.activa).length || 0

    return {
      ...clase,
      inscriptos,
      cuposDisponibles: clase.capacidad - inscriptos,
    }
  })
}

export async function verificarCupoDisponible(claseId) {
  const { data, error } = await supabase
    .from('clase')
    .select('capacidad, inscripcion(id, activa)')
    .eq('id', claseId)
    .single()

  if (error) throw error

  const inscriptosActuales = data.inscripcion?.filter((i) => i.activa).length || 0
  const cuposLibres = data.capacidad - inscriptosActuales

  return cuposLibres > 0
}