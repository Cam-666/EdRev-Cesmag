/*
 * paresService — llamadas HTTP del módulo de pares: la base de pares (listado, áreas, ficha, registro, edición,
 * bloqueo y desbloqueo). Cada llamada lleva la revista en la URL.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  MotivoBloqueo,
  NuevoPar,
  ParDetalle,
  ParEvaluador,
  ParListado,
} from '@/types/par'
import type { Revista } from '@/types/revista'

/** `asignables`: no bloqueados, sin evaluación en curso y que aún no están en el artículo. */
export type FiltroEstadoPares = 'disponibles' | 'bloqueados' | 'todos' | 'asignables'

export interface FiltrosPares {
  q?: string
  area?: string
  universidad?: string
  estado: FiltroEstadoPares
  /** Artículo en el que se trabaja: el estado «misma institución» se calcula contra sus autores. */
  articulo?: string
  pagina: number
  porPagina: number
}

export interface RespuestaPares {
  items: ParListado[]
  total: number
  /** Pares de toda la base (no solo los filtrados). */
  totalBase: number
  totalBloqueados: number
}

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

export function listarPares(revista: Revista, f: FiltrosPares): Promise<RespuestaPares> {
  const q = new URLSearchParams({
    estado: f.estado,
    pagina: String(f.pagina),
    porPagina: String(f.porPagina),
  })
  if (f.q) q.set('q', f.q)
  if (f.area) q.set('area', f.area)
  if (f.universidad) q.set('universidad', f.universidad)
  if (f.articulo) q.set('articulo', f.articulo)
  return solicitar<RespuestaPares>(`/${revista}/pares?${q.toString()}`)
}

export function listarAreas(revista: Revista): Promise<string[]> {
  return solicitar<string[]>(`/${revista}/pares/areas`)
}

export function listarUniversidades(revista: Revista): Promise<string[]> {
  return solicitar<string[]>(`/${revista}/pares/universidades`)
}

export function obtenerPar(revista: Revista, id: string): Promise<ParDetalle> {
  return solicitar<ParDetalle>(`/${revista}/pares/${encodeURIComponent(id)}`)
}

export function registrarPar(revista: Revista, datos: NuevoPar): Promise<ParDetalle> {
  return solicitar<ParDetalle>(`/${revista}/pares`, { method: 'POST', ...json(datos) })
}

export function editarPar(
  revista: Revista,
  id: string,
  cambios: Partial<Pick<ParEvaluador, 'nombre' | 'profesion' | 'correo' | 'universidad' | 'area'>>,
): Promise<ParDetalle> {
  return solicitar<ParDetalle>(`/${revista}/pares/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    ...json(cambios),
  })
}

export function bloquearPar(
  revista: Revista,
  id: string,
  motivo: MotivoBloqueo,
): Promise<ParDetalle> {
  return solicitar<ParDetalle>(`/${revista}/pares/${encodeURIComponent(id)}/bloquear`, {
    method: 'POST',
    ...json({ motivo }),
  })
}

export function desbloquearPar(revista: Revista, id: string, motivo: string): Promise<ParDetalle> {
  return solicitar<ParDetalle>(`/${revista}/pares/${encodeURIComponent(id)}/desbloquear`, {
    method: 'POST',
    ...json({ motivo }),
  })
}
