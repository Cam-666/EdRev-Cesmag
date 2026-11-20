/*
 * Hooks del flujo de asignación: asignar un par disponible o un candidato nuevo (el servidor envía la
 * invitación), reenviar tras un rebote o fallo, la respuesta del par, la marca de entrega y el concepto.
 */
import { useMutation } from '@tanstack/react-query'
import {
  asignarPar,
  marcarEntrega,
  registrarConcepto,
  registrarRespuesta,
  reenviarInvitacion,
} from '../services/asignacionesService'
import { useInvalidarPares } from './useInvalidarPares'
import { useRevista } from '@/lib/revista/useRevista'
import type { ConceptoPar, DatosAsignacion, RespuestaPar } from '@/types/par'

export function useAsignarPar(articuloId: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (datos: DatosAsignacion) => asignarPar(revista, articuloId, datos),
    onSuccess: invalidar,
  })
}

export function useReenviarInvitacion() {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (asignacionId: string) => reenviarInvitacion(revista, asignacionId),
    onSuccess: invalidar,
  })
}

export function useRegistrarRespuesta() {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: ({ asignacionId, respuesta }: { asignacionId: string; respuesta: RespuestaPar }) =>
      registrarRespuesta(revista, asignacionId, respuesta),
    onSuccess: invalidar,
  })
}

export function useMarcarEntrega() {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: ({
      asignacionId,
      fecha,
      concepto,
    }: {
      asignacionId: string
      fecha: string
      concepto: ConceptoPar
    }) => marcarEntrega(revista, asignacionId, fecha, concepto),
    onSuccess: invalidar,
  })
}

export function useRegistrarConcepto() {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: ({ asignacionId, concepto }: { asignacionId: string; concepto: ConceptoPar }) =>
      registrarConcepto(revista, asignacionId, concepto),
    onSuccess: invalidar,
  })
}
