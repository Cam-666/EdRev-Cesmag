/*
 * asignacionesService — HTTP calls to assign peers to an article and follow their answer:
 * assignment of an available peer or a new candidate (the server sends the invitation), resend / reminder, the peer's
 * answer, delivery mark and concept. Covers: RF-17, RF-19..RF-29.
 */
import { solicitar } from '@/lib/api/cliente'
import type {
  Asignacion,
  ConceptoPar,
  DatosAsignacion,
  EntregaRegistrada,
  ResultadoAsignacion,
  RespuestaPar,
} from '@/types/par'
import type { Revista } from '@/types/revista'

function json(cuerpo: unknown): { body: string } {
  return { body: JSON.stringify(cuerpo) }
}

const art = (id: string) => encodeURIComponent(id)

export function asignarPar(
  revista: Revista,
  articuloId: string,
  datos: DatosAsignacion,
): Promise<ResultadoAsignacion> {
  return solicitar<ResultadoAsignacion>(`/${revista}/articulos/${art(articuloId)}/asignaciones`, {
    method: 'POST',
    ...json(datos),
  })
}

/** RF-28: resends the invitation after a bounce or a failure (it is not a new attempt). */
export function reenviarInvitacion(
  revista: Revista,
  asignacionId: string,
): Promise<ResultadoAsignacion> {
  return solicitar<ResultadoAsignacion>(`/${revista}/asignaciones/${art(asignacionId)}/reenviar`, {
    method: 'POST',
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
  concepto: ConceptoPar,
): Promise<EntregaRegistrada> {
  return solicitar<EntregaRegistrada>(`/${revista}/asignaciones/${art(asignacionId)}/entrega`, {
    method: 'POST',
    ...json({ fecha, concepto }),
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
