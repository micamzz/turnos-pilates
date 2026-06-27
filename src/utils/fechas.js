// Dado un offset de semanas (0 = esta semana, 1 = la próxima, -1 = la anterior),
// devuelve un array con las fechas de Lunes a Viernes de esa semana
export function obtenerDiasDeLaSemana(offsetSemanas = 0) {
  const hoy = new Date()
  const diaActual = hoy.getDay()

  // Calcula cuántos días hay que retroceder para llegar al Lunes de esta semana
  const diferenciaHastaLunes = diaActual === 0 ? -6 : 1 - diaActual

  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diferenciaHastaLunes + offsetSemanas * 7)

  const dias = []
  for (let i = 0; i < 5; i++) {
    const fecha = new Date(lunes)
    fecha.setDate(lunes.getDate() + i)
    dias.push(fecha)
  }
  return dias
}

// Convierte un objeto Date a string 'YYYY-MM-DD', que es el formato que usa Postgres
export function formatearFechaISO(fecha) {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

export function nombreDia(fecha) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[fecha.getDay()]
}

export function proximaFechaDeDia(nombreDiaBuscado) {
  const diasOrden = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado']
  const indiceBuscado = diasOrden.indexOf(nombreDiaBuscado)

  const hoy = new Date()
  const diferencia = (indiceBuscado - hoy.getDay() + 7) % 7
  // Si hoy es el mismo día buscado, devuelve la próxima semana (no hoy mismo)
  const diasAAgregar = diferencia === 0 ? 7 : diferencia

  const proxima = new Date(hoy)
  proxima.setDate(hoy.getDate() + diasAAgregar)
  return proxima
}

export function formatearFechaCompleta(fecha = new Date()) {
  const diaNombre = fecha.toLocaleDateString('es-AR', { weekday: 'long' })
  const dia = fecha.getDate()
  const mes = fecha.toLocaleDateString('es-AR', { month: 'long' })
  const anio = fecha.getFullYear()

  const capitalizar = (str) => str.charAt(0).toUpperCase() + str.slice(1)

  return `${capitalizar(diaNombre)}, ${dia} de ${mes} de ${anio}`
}

export function agruparClasesPorDia(clases) {
  const diasOrdenados = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes']
  return diasOrdenados.map((dia) => ({
    dia,
    clases: clases.filter((c) => c.dia_semana === dia),
  }))
}


export function primerYUltimoDiaDelMes(fechaReferencia) {
  const fecha = new Date(fechaReferencia)
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)

  return {
    desde: formatearFechaISO(primerDia),
    hasta: formatearFechaISO(ultimoDia),
  }
}

/* Calcula si una fecha (string 'YYYY-MM-DD') ya pasó 
comparando solo el día (sin horas) para que "hoy" nunca cuente como pasado.*/
export function esFechaPasada(fechaISO) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fecha = new Date(fechaISO)
  fecha.setHours(0, 0, 0, 0)
  return fecha < hoy
}

/*Calcula si una clase ya pasó, comparando la fecha y hora de la clase con el momento actual.
 calcula hasta el dia siguiente a las 12:00 */
export function claseYaPaso(fechaISO, horaClase) {
  // Arma la fecha/hora exacta en que la clase debería bloquearse:
  // el día siguiente a la fecha de la clase, a las 12:00.
  const [horas, minutos] = horaClase.split(':')
  const fechaClase = new Date(fechaISO)
  fechaClase.setHours(Number(horas), Number(minutos), 0, 0)

  const momentoDeBloqueo = new Date(fechaClase)
  momentoDeBloqueo.setDate(momentoDeBloqueo.getDate() + 1)
  momentoDeBloqueo.setHours(12, 0, 0, 0)

  const ahora = new Date()
  return ahora >= momentoDeBloqueo
}


/* Devuelve que clientes estan anotados en ese dia y hora, 
permite que se pueda agregar gente de prueba(que no estan agendados como clientes)  */

export function clientesEnClaseYFecha(inscripcionesDeLaClase, reservas, claseId, fechaISO) {
  const fijosActivos = inscripcionesDeLaClase.filter((i) => {
    const fueCancelado = reservas.some(
      (r) =>
        r.cliente_id === i.cliente_id &&
        String(r.clase_id) === String(claseId) &&
        r.fecha === fechaISO &&
        r.estado === 'CANCELADA'
    )
    return !fueCancelado
  })

  const recuperos = reservas
    .filter(
      (r) =>
        String(r.clase_id) === String(claseId) &&
        r.fecha === fechaISO &&
        r.estado === 'RECUPERO'
    )
    .map((r) => ({
      id: `recupero-${r.id}`,
      cliente_id: r.cliente_id,
      clientes: r.clientes,
      esRecupero: true,
    }))

  const pruebas = reservas
    .filter(
      (r) =>
        String(r.clase_id) === String(claseId) &&
        r.fecha === fechaISO &&
        r.estado === 'PRUEBA'
    )
    .map((r) => ({
      id: `prueba-${r.id}`,
      cliente_id: null,
      clientes: { nombre: r.nombre_invitado, apellido: '' },
      esPrueba: true,
    }))

  const todos = [...fijosActivos, ...recuperos, ...pruebas]


  /* A cada persona de la lista final, se le agrega si ya confirmo asistencia(en reserva
  está el estado ASISTIO para cliente_id, clase_id y fecha) , una persona que viene de prueba no puede registrar asisntecia.*/
  return todos.map((persona) => ({
    ...persona,
    asistio: reservas.some(
      (r) =>
        r.cliente_id === persona.cliente_id &&
        String(r.clase_id) === String(claseId) &&
        r.fecha === fechaISO &&
        r.estado === 'ASISTIO'
    ),
  }))
}