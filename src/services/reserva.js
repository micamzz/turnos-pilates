import { supabase } from '../config/supabase'

// Trae las reservas (excepciones de cancelación) de una fecha puntual
export async function obtenerReservasPorFecha(fecha) {
  const { data, error } = await supabase
    .from('reserva')
    .select('*')
    .eq('fecha', fecha)

  if (error) throw error
  return data
}

// Marca una clase puntual como cancelada para un cliente
export async function cancelarTurno(clienteId, claseId, fecha) {
  const { data, error } = await supabase
    .from('reserva')
    .upsert(
      { cliente_id: clienteId, clase_id: claseId, fecha, estado: 'CANCELADA' },
      { onConflict: 'cliente_id,clase_id,fecha' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}