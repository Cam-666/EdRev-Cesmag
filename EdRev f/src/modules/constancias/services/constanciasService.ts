/*
 * constanciasService — HTTP calls of the constancias module: pending and issued lists, preview
 * rendered from the template, issue, issue all pending and reissue. Covers: RF-30..RF-34.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  RespuestaConstancias,
  ResultadoEmision,
  ResultadoEmisionMasiva,
  VistaConstancia,
} from '@/types/constancia'
import type { Revista } from '@/types/revista'

const id = (valor: string) => encodeURIComponent(valor)

export function listarConstancias(revista: Revista): Promise<RespuestaConstancias> {
  return solicitar<RespuestaConstancias>(`/${revista}/constancias`)
}

export function obtenerVistaConstancia(
  revista: Revista,
  constanciaId: string,
): Promise<VistaConstancia> {
  return solicitar<VistaConstancia>(`/${revista}/constancias/${id(constanciaId)}/vista-previa`)
}

export function emitirConstancia(
  revista: Revista,
  constanciaId: string,
): Promise<ResultadoEmision> {
  return solicitar<ResultadoEmision>(`/${revista}/constancias/${id(constanciaId)}/emitir`, {
    method: 'POST',
  })
}

export function emitirPendientes(revista: Revista): Promise<ResultadoEmisionMasiva> {
  return solicitar<ResultadoEmisionMasiva>(`/${revista}/constancias/emitir-pendientes`, {
    method: 'POST',
  })
}

export function reenviarConstancia(
  revista: Revista,
  constanciaId: string,
): Promise<ResultadoEmision> {
  return solicitar<ResultadoEmision>(`/${revista}/constancias/${id(constanciaId)}/reenviar`, {
    method: 'POST',
  })
}
