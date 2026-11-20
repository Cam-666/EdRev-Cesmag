/*
 * anios — año de gestión de un artículo (el listado del año en que se trabaja). Un artículo cuyo proceso sigue
 * abierto (Postulado, En revisión, En evaluación) de un año anterior pasa solo al listado del año actual; su
 * fecha de postulación no cambia. Un artículo cerrado se queda en el año en que se postuló.
 */
import type { EstadoArticulo } from '@/types/articulo'

const ABIERTOS: readonly EstadoArticulo[] = ['postulado', 'en-revision', 'en-evaluacion']

export function anioDeGestion(
  articulo: { estado: EstadoArticulo; fechaPostulacion: string },
  hoy: Date = new Date(),
): number | null {
  const anio = Number(articulo.fechaPostulacion.slice(0, 4))
  if (!Number.isFinite(anio) || anio === 0) return null
  return ABIERTOS.includes(articulo.estado) && anio < hoy.getFullYear() ? hoy.getFullYear() : anio
}
