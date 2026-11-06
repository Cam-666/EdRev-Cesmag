import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** Visible date format: dd MMM yyyy (ISO 8601 in data). */
export function formatearFecha(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy', { locale: es }).replace('.', '')
}

/** Visible date + time, e.g. "26 oct · 16:02". */
export function formatearFechaHora(iso: string): string {
  return format(parseISO(iso), 'dd MMM · HH:mm', { locale: es }).replace('.', '')
}
