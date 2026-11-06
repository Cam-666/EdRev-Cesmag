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

/** Hides most of the local part of an email: "maria.lopez@x.co" -> "m·····z@x.co". */
export function enmascararCorreo(correo: string): string {
  const [local = '', dominio = ''] = correo.split('@')
  if (local.length <= 2) return `${local.charAt(0)}·····@${dominio}`
  return `${local.charAt(0)}·····${local.charAt(local.length - 1)}@${dominio}`
}

/** mm:ss for countdowns. */
export function formatearCuenta(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}
