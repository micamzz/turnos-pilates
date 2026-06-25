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

// Nombre del día en español, para mostrar en la grilla
export function nombreDia(fecha) {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[fecha.getDay()]
}