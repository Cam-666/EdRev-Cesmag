/*
 * fechas — «hoy» tal como lo vive la dependencia. El servidor puede correr en UTC, donde la noche de
 * Colombia ya es el día siguiente; una entrega registrada a las 8 p. m. no debe verse como si fuera del
 * futuro. La zona horaria es ZONA_HORARIA (por defecto America/Bogota).
 */
import { config } from '../config.js'

/** La fecha (aaaa-mm-dd) de un instante en la zona horaria de la dependencia. */
export function fechaLocal(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}

/** Una fecha de calendario tal como la escribe el usuario: cuatro dígitos, dos, dos. */
export const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/
