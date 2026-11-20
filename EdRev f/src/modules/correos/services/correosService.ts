/*
 * correosService — llamadas HTTP del módulo de correos enviados: el registro de correos de la revista con
 * contadores, el reintento de correos fallidos o en cola y «corregir y reenviar».
 */
import { solicitar } from '@/lib/api/cliente'
import type { CorreoEnviado, EstadoCorreo, TipoCorreo } from '@/types/historial'
import type { Revista } from '@/types/revista'

export interface CorreoConArticulo extends CorreoEnviado {
  numeroOjs: string
}

export interface FiltrosCorreos {
  tipo?: TipoCorreo
  estado?: EstadoCorreo
  pagina: number
  porPagina: number
}

export interface RespuestaCorreos {
  items: CorreoConArticulo[]
  total: number
  enviados: number
  /** Correos rebotados y fallidos que aún esperan una corrección o un reintento. */
  rebotados: number
  fallidos: number
  enCola: number
}

export interface ResultadoReintentos {
  reintentados: number
  enviados: number
  siguenFallando: number
}

const id = (valor: string) => encodeURIComponent(valor)

export function listarCorreos(revista: Revista, f: FiltrosCorreos): Promise<RespuestaCorreos> {
  const q = new URLSearchParams({ pagina: String(f.pagina), porPagina: String(f.porPagina) })
  if (f.tipo) q.set('tipo', f.tipo)
  if (f.estado) q.set('estado', f.estado)
  return solicitar<RespuestaCorreos>(`/${revista}/correos?${q.toString()}`)
}

export function reintentarCorreo(
  revista: Revista,
  correoId: string,
): Promise<{ estado: EstadoCorreo }> {
  return solicitar(`/${revista}/correos/${id(correoId)}/reintentar`, { method: 'POST' })
}

export function reintentarFallidos(revista: Revista): Promise<ResultadoReintentos> {
  return solicitar<ResultadoReintentos>(`/${revista}/correos/reintentar-fallidos`, {
    method: 'POST',
  })
}

export function corregirYReenviar(
  revista: Revista,
  correoId: string,
  correo: string,
): Promise<{ estado: EstadoCorreo }> {
  return solicitar(`/${revista}/correos/${id(correoId)}/corregir`, {
    method: 'POST',
    body: JSON.stringify({ correo }),
  })
}
