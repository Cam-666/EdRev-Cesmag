/*
 * asignacionesService — llamadas HTTP para asignar pares a un artículo y seguir su respuesta: asignación de un par
 * disponible o de un candidato nuevo (el servidor envía la invitación), reenvío, la respuesta del par, la marca
 * de entrega y el concepto.
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

/** Reenvía la invitación tras un rebote o un fallo (no es un intento nuevo). */
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
