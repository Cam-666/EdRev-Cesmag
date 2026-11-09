/*
 * paresService — HTTP calls of the peers module: the journal's peer base (list, areas, record,
 * registration, edition, block / unblock). Each call carries the journal in the URL.
 * Covers: RF-12..RF-18, RNF-06.
 */
import { solicitar } from '@/lib/api/cliente'
import type { MotivoBloqueo, NuevoPar, ParDetalle, ParEvaluador, ParListado } from '@/types/par'
import type { Revista } from '@/types/revista'

export type FiltroEstadoPares = 'disponibles' | 'bloqueados' | 'todos'

export interface FiltrosPares {
  q?: string
  area?: string
  universidad?: string
  estado: FiltroEstadoPares
  /** Article being worked on: the "Conflicto posible" flag is computed against its authors. */
  articulo?: string
  pagina: number
  porPagina: number
}

export interface RespuestaPares {
  items: ParListado[]
  total: number
  /** Peers of the whole journal base (not only the filtered ones). */
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
  cambios: Partial<Pick<ParEvaluador, 'nombre' | 'correo' | 'universidad' | 'area'>>,
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
