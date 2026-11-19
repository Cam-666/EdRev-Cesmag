import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

/** Visible date format: dd MMM yyyy (ISO 8601 in data). */
export function formatearFecha(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy', { locale: es }).replace('.', '')
}

/** Visible date + time on a 12-hour clock, e.g. "26 oct · 4:02 p. m.". */
export function formatearFechaHora(iso: string): string {
  const fecha = parseISO(iso)
  const dia = format(fecha, 'dd MMM', { locale: es }).replace('.', '')
  const hora = format(fecha, 'h:mm')
  return `${dia} · ${hora} ${fecha.getHours() < 12 ? 'a. m.' : 'p. m.'}`
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

/** "Ma. Camila Mendoza" -> "Ma. C. Mendoza"; "Andrea Villota" -> "A. Villota". */
export function abreviarNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/)
  if (partes.length >= 3) {
    const [primero = '', segundo = ''] = partes
    return `${primero} ${segundo.charAt(0)}. ${partes[partes.length - 1] ?? ''}`
  }
  if (partes.length === 2) return `${(partes[0] ?? '').charAt(0)}. ${partes[1] ?? ''}`
  return nombre
}

/** Long date for statements such as "Archivado el 30 de septiembre de 2026". */
export function formatearFechaLarga(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es })
}
