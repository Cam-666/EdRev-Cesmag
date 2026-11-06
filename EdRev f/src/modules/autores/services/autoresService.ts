/*
 * autoresService — HTTP calls of the authors module (reusable author records of a journal).
 * Covers: RF-10 (search by name or ORCID), RF-09 (edit the record), RF-11.
 */
import { solicitar } from '@/lib/api/cliente'
import type { Autor, DatosAutor } from '@/types/autor'
import type { Revista } from '@/types/revista'

export interface AutorConTotal extends Autor {
  totalArticulos: number
}

export interface RespuestaAutores {
  items: AutorConTotal[]
  total: number
}

export function buscarAutores(revista: Revista, q: string, limite = 50): Promise<RespuestaAutores> {
  const params = new URLSearchParams({ q, limite: String(limite) })
  return solicitar<RespuestaAutores>(`/${revista}/autores?${params.toString()}`)
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
