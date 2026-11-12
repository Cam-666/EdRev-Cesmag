/*
 * publicacion — volume and number of the journal issue where an approved article is published
 * (RF-04). They are always registered together; the list filter orders them from the most recent
 * to the oldest (RF-35). Shared by the screens and the mock API.
 */
import type { Publicacion } from '@/types/articulo'

export function etiquetaPublicacion(p: Publicacion): string {
  return `Vol. ${p.volumen} n.º ${p.numero}`
}

/** Value of the list filter, e.g. "10-2". */
export function clavePublicacion(p: Publicacion): string {
  return `${p.volumen}-${p.numero}`
}

/** Most recent first. */
export function compararPublicaciones(a: Publicacion, b: Publicacion): number {
  return b.volumen - a.volumen || b.numero - a.numero
}
