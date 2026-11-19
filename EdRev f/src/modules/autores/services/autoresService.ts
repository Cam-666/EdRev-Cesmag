/*
 * autoresService — HTTP calls of the common author directory of both journals.
 * Covers: RF-10 (search by name or ORCID, filter by journal), RF-09 (edit the record), RF-11.
 */
import { solicitar } from '@/lib/api/cliente'
import type { ArticuloDeAutor, Autor, DatosAutor } from '@/types/autor'
import type { Revista } from '@/types/revista'

export interface AutorConTotal extends Autor {
  totalArticulos: number
  /** Journals where the author has articles. */
  revistas: Revista[]
}

export interface RespuestaAutores {
  items: AutorConTotal[]
  total: number
}

/** Filters of the author list; each one that is omitted does not narrow the directory. */
export interface FiltrosAutores {
  /** Authors with articles in that journal. */
  en?: Revista
  pais?: string
  /** Institution (the last known affiliation). */
  filiacion?: string
  orcid?: 'con' | 'sin'
  /** «uno»: a single article; «varios»: two or more. */
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

/** The countries and institutions present in the directory, to fill the filters. */
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
