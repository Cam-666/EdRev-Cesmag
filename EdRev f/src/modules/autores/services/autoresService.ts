/*
 * autoresService — llamadas HTTP del directorio común de autores de las dos revistas: búsqueda por nombre u
 * ORCID, filtro por revista, edición de la ficha.
 */
import { solicitar } from '@/lib/api/cliente'
import type { ArticuloDeAutor, Autor, DatosAutor } from '@/types/autor'
import type { Revista } from '@/types/revista'

export interface AutorConTotal extends Autor {
  totalArticulos: number
  /** Revistas donde el autor tiene artículos. */
  revistas: Revista[]
}

export interface RespuestaAutores {
  items: AutorConTotal[]
  total: number
}

/** Filtros del listado de autores; cada uno que se omite no restringe el directorio. */
export interface FiltrosAutores {
  /** Autores con artículos en esa revista. */
  en?: Revista
  pais?: string
  /** Institución (la última filiación conocida). */
  filiacion?: string
  orcid?: 'con' | 'sin'
  /** «uno»: un solo artículo; «varios»: dos o más. */
  articulos?: 'uno' | 'varios'
}

export function buscarAutores(
  revista: Revista,
  q: string,
  limite = 50,
  filtros: FiltrosAutores = {},
): Promise<RespuestaAutores> {
  const params = new URLSearchParams({ q, limite: String(limite) })
  for (const [clave, valor] of Object.entries(filtros)) if (valor) params.set(clave, valor)
  return solicitar<RespuestaAutores>(`/${revista}/autores?${params.toString()}`)
}

/** Los países e instituciones presentes en el directorio, para llenar los filtros. */
export function opcionesDeFiltros(revista: Revista): Promise<{ paises: string[]; filiaciones: string[] }> {
  return solicitar(`/${revista}/autores/filtros`)
}

export function obtenerAutor(revista: Revista, id: string): Promise<Autor> {
  return solicitar<Autor>(`/${revista}/autores/${encodeURIComponent(id)}`)
}

export function editarAutor(
  revista: Revista,
  id: string,
  datos: Partial<DatosAutor>,
): Promise<Autor> {
  return solicitar<Autor>(`/${revista}/autores/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  })
}

export function registrarAutor(revista: Revista, datos: DatosAutor): Promise<Autor> {
  return solicitar<Autor>(`/${revista}/autores`, { method: 'POST', body: JSON.stringify(datos) })
}

export function articulosDeAutor(revista: Revista, id: string): Promise<ArticuloDeAutor[]> {
  return solicitar<ArticuloDeAutor[]>(`/${revista}/autores/${encodeURIComponent(id)}/articulos`)
}
