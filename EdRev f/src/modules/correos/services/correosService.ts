/*
 * correosService — HTTP calls of the sent-mail module: the journal's mail log with counters, retry
 * of failed / queued mails and "corregir y reenviar". Covers: RF-26, RF-27, RF-28, RNF-02.
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
  entregados: number
  rebotados: number
  enCola: number
}

export interface ResultadoReintentos {
  reintentados: number
  entregados: number
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
