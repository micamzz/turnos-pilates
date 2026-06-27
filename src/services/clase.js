import { supabase } from '../config/supabase'
import { clientesEnClaseYFecha } from '../utils/fechas' 

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

/* Calcula el cupo real de una clase para una fecha puntual*/
export function calcularCuposRealesPorFecha(clase, inscripcionesDeLaClase, reservasDeLaFecha, fechaISO) {
  const presentes = clientesEnClaseYFecha(inscripcionesDeLaClase, reservasDeLaFecha, clase.id, fechaISO)
  return clase.capacidad - presentes.length
}