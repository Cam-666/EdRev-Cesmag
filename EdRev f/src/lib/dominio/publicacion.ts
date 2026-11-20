/*
 * publicacion — volumen y número de la edición de la revista donde se publica un artículo aprobado. Siempre se
 * registran juntos; el filtro del listado los ordena del más reciente al más antiguo. Lo comparten las
 * pantallas y la API simulada.
 */
import type { Publicacion } from '@/types/articulo'

export function etiquetaPublicacion(p: Publicacion): string {
  return `Vol. ${p.volumen} n.º ${p.numero}`
}

/** Valor del filtro del listado, por ejemplo "10-2". */
export function clavePublicacion(p: Publicacion): string {
  return `${p.volumen}-${p.numero}`
}

/** El más reciente primero. */
export function compararPublicaciones(a: Publicacion, b: Publicacion): number {
  return b.volumen - a.volumen || b.numero - a.numero
}
