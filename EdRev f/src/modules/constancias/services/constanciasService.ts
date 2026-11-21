/*
 * constanciasService — llamadas HTTP del módulo de constancias: listas de pendientes y emitidas, vista previa
 * armada con la plantilla, emitir, emitir todas las pendientes y reenviar.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  RespuestaConstancias,
  ResultadoEmision,
  ResultadoEmisionMasiva,
  VistaConstancia,
} from '@/types/constancia'
import type { EleccionCorreo } from '@/types/plantilla'
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

/** `conAgradecimiento`: el correo lleva el texto de agradecimiento de la revista; si no, solo la constancia. */
export function emitirConstancia(
  revista: Revista,
  constanciaId: string,
  conAgradecimiento: boolean,
  eleccion?: EleccionCorreo,
): Promise<ResultadoEmision> {
  return solicitar<ResultadoEmision>(`/${revista}/constancias/${id(constanciaId)}/emitir`, {
    method: 'POST',
    body: JSON.stringify({ conAgradecimiento, ...eleccion }),
  })
}

export function emitirPendientes(
  revista: Revista,
  conAgradecimiento: boolean,
  eleccion?: EleccionCorreo,
): Promise<ResultadoEmisionMasiva> {
  return solicitar<ResultadoEmisionMasiva>(`/${revista}/constancias/emitir-pendientes`, {
    method: 'POST',
    body: JSON.stringify({ conAgradecimiento, ...eleccion }),
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
