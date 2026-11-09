/*
 * asignacionesService — HTTP calls to assign peers to an article and follow their answer:
 * invitation preview, assignment (the server sends the invitation), resend / reminder, the peer's
 * answer, delivery mark and concept. Covers: RF-17, RF-19..RF-29.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  Asignacion,
  ConceptoPar,
  ResultadoAsignacion,
  RespuestaPar,
  VistaPreviaInvitacion,
} from '@/types/par'
import type { Revista } from '@/types/revista'

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

const art = (id: string) => encodeURIComponent(id)

export function obtenerVistaPrevia(
  revista: Revista,
  articuloId: string,
  parId: string,
): Promise<VistaPreviaInvitacion> {
  return solicitar<VistaPreviaInvitacion>(
    `/${revista}/articulos/${art(articuloId)}/asignaciones/vista-previa?parId=${encodeURIComponent(parId)}`,
  )
}

export function asignarPar(
  revista: Revista,
  articuloId: string,
  parId: string,
): Promise<ResultadoAsignacion> {
  return solicitar<ResultadoAsignacion>(`/${revista}/articulos/${art(articuloId)}/asignaciones`, {
    method: 'POST',
    ...json({ parId }),
  })
}

export function reenviarInvitacion(
  revista: Revista,
  asignacionId: string,
  tipo: 'reenvio' | 'recordatorio',
): Promise<ResultadoAsignacion> {
  return solicitar<ResultadoAsignacion>(`/${revista}/asignaciones/${art(asignacionId)}/reenviar`, {
    method: 'POST',
    ...json({ tipo }),
  })
}

export function registrarRespuesta(
  revista: Revista,
  asignacionId: string,
  respuesta: RespuestaPar,
): Promise<Asignacion> {
  return solicitar<Asignacion>(`/${revista}/asignaciones/${art(asignacionId)}/respuesta`, {
    method: 'POST',
    ...json({ respuesta }),
  })
}

export function marcarEntrega(
  revista: Revista,
  asignacionId: string,
  fecha: string,
): Promise<Asignacion> {
  return solicitar<Asignacion>(`/${revista}/asignaciones/${art(asignacionId)}/entrega`, {
    method: 'POST',
    ...json({ fecha }),
  })
}

export function registrarConcepto(
  revista: Revista,
  asignacionId: string,
  concepto: ConceptoPar,
): Promise<Asignacion> {
  return solicitar<Asignacion>(`/${revista}/asignaciones/${art(asignacionId)}/concepto`, {
    method: 'POST',
    ...json({ concepto }),
  })
}
