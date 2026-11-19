/*
 * fechas — «today» as the dependency lives it. The server may run in UTC, where the evening of
 * Colombia is already tomorrow; a delivery registered at 8 p.m. must not look like it is in the
 * future. The time zone is ZONA_HORARIA (default America/Bogota).
 */
import { config } from '../config.js'

/** The date (YYYY-MM-DD) of an instant in the time zone of the dependency. */
export function fechaLocal(instante: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}

/** A calendar date as the user typed it: four digits, two, two. */
export const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/
