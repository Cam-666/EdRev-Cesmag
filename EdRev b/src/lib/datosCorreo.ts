/*
 * datosCorreo — los datos que puede traer el texto de un correo (invitación, agradecimiento o mensaje libre) y cómo
 * se escriben: fechas largas en la zona horaria de la dependencia, el tipo y el estado del artículo en palabras,
 * el plazo para responder… Los usan el envío real, los mensajes libres y las vistas previas, para que la vista
 * previa diga exactamente lo mismo que el correo que sale.
 */
import { config } from '../config.js'

export const TIPO_ARTICULO: Record<string, string> = {
  investigacion: 'Investigación',
  reflexion: 'Reflexión',
  revision: 'Revisión',
}

export const ESTADO_ARTICULO: Record<string, string> = {
  postulado: 'Postulado',
  'en-revision': 'En revisión',
  'en-evaluacion': 'En evaluación',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
}

/** «23 de noviembre de 2026», en la zona horaria de la dependencia. */
export function fechaEscrita(d: Date | string | null | undefined): string {
  if (!d) return ''
  // Una fecha sin hora ('2026-11-23') es ese día, no la medianoche UTC del día anterior en Colombia.
  const fecha = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : new Date(d)
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: config.zonaHoraria })
}

/** «5 días» (o «1 día»); los días de espera pueden tener decimales en una demostración. */
export function plazoEscrito(dias: number): string {
  const n = Number.isInteger(dias) ? String(dias) : String(Math.round(dias * 100) / 100).replace('.', ',')
  return `${n} ${dias === 1 ? 'día' : 'días'}`
}

/** La fecha hasta la que el par puede responder: hoy más los días de espera. */
export function limiteEscrito(dias: number, desde = new Date()): string {
  return fechaEscrita(new Date(desde.getTime() + dias * 86_400_000))
}

/** Los datos de la revista que cualquier correo puede traer. */
export function datosRevista(r: { nombre: string; issn: string | null; indexaciones: string | null; correo_remitente: string }) {
  const hoy = new Date()
  return {
    revista: r.nombre,
    REVISTA: r.nombre.toUpperCase(),
    issn: r.issn ?? '',
    indexaciones: r.indexaciones ?? '',
    contacto: r.correo_remitente,
    fecha: fechaEscrita(hoy),
    anio: String(hoy.getFullYear()),
  }
}

/** Datos de ejemplo de la persona y del artículo, para las vistas previas de las plantillas. */
export const EJEMPLO = {
  numero: '2026-034',
  articulo: 'Alfabetización mediática en la formación de maestros',
  tipo: 'Investigación',
  estado: 'En evaluación',
  par: 'Luz Marina Burbano',
  PAR: 'LUZ MARINA BURBANO',
  nombre: 'Luz Marina Burbano',
  NOMBRE: 'LUZ MARINA BURBANO',
  correo: 'lm.burbano@udenar.edu.co',
  profesion: 'Magíster en Educación',
  universidad: 'Universidad de Nariño',
  area: 'Educación',
  pais: 'Colombia',
  orcid: '0000-0002-1825-0097',
  entrega: fechaEscrita(new Date()),
}
