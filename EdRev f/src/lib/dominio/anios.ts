/*
 * anios — year of management of an article (the list of the year it is worked on). An article
 * whose process is still open (Postulado, En revisión, En evaluación) from a previous year passes
 * by itself to the current year's list; its postulation date does not change. A closed article
 * stays in the year it was postulated. Covers: the dependency's yearly volumes.
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
