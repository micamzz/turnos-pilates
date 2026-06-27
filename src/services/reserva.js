import { supabase } from '../config/supabase'
import { primerYUltimoDiaDelMes } from '../utils/fechas'


// Trae las reservas (cancelaciones y recuperos) dentro de un rango de fechas
export async function obtenerReservasEnRango(desde, hasta) {
  const { data, error } = await supabase
    .from('reserva')
    .select('*, clientes(nombre, apellido)')
    .gte('fecha', desde)
    .lte('fecha', hasta)

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

// Trae las cancelaciones (CANCELADA) del mes que no fueron recuperadas.
export async function obtenerCancelacionesDelMes(fechaReferencia) {
  
  const { desde, hasta } = primerYUltimoDiaDelMes(fechaReferencia)

  const { data: canceladas, error: errorCanceladas } = await supabase
    .from('reserva')
    .select('*, clientes(nombre, apellido)')
    .eq('estado', 'CANCELADA')
    .gte('fecha', desde)
    .lte('fecha', hasta)

  if (errorCanceladas) throw errorCanceladas

  const { data: recuperos, error: errorRecuperos } = await supabase
    .from('reserva')
    .select('cliente_id, fecha')
    .eq('estado', 'RECUPERO')
    .gte('fecha', desde)
    .lte('fecha', hasta)

  if (errorRecuperos) throw errorRecuperos

  return canceladas.filter(
    (c) => !recuperos.some((r) => r.cliente_id === c.cliente_id && r.fecha === c.fecha)
  )
}

// Registra que un cliente recupera una clase puntual (no es su día fijo)
export async function crearRecupero(clienteId, claseId, fecha) {
  const { data, error } = await supabase
    .from('reserva')
    .insert({ cliente_id: clienteId, clase_id: claseId, fecha, estado: 'RECUPERO' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function crearVisitaDePrueba(nombreInvitado, claseId, fecha) {
  const { data, error } = await supabase
    .from('reserva')
    .insert({ nombre_invitado: nombreInvitado, clase_id: claseId, fecha, estado: 'PRUEBA' })
    .select()
    .single()

  if (error) throw error
  return data
}

// Registra que un cliente asistió efectivamente a una clase puntual.
export async function marcarAsistencia(clienteId, claseId, fecha) {
  const { data, error } = await supabase
    .from('reserva')
    .upsert(
      { cliente_id: clienteId, clase_id: claseId, fecha, estado: 'ASISTIO' },
      { onConflict: 'cliente_id,clase_id,fecha' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}