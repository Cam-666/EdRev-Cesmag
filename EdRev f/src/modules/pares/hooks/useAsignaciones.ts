/*
 * Hooks of the assignment flow: assign an available peer or a new candidate (the server sends
 * the invitation),
 * resend after a bounce or failure, peer's answer, delivery mark and concept. Covers: RF-17, RF-19..RF-29.
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
    mutationFn: ({ asignacionId, fecha }: { asignacionId: string; fecha: string }) =>
      marcarEntrega(revista, asignacionId, fecha),
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
