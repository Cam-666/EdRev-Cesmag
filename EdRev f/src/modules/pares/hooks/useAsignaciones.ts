/*
 * Hooks of the assignment flow: invitation preview, assign (the server sends the invitation),
 * resend / reminder, peer's answer, delivery mark and concept. Covers: RF-17, RF-19..RF-29.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  asignarPar,
  marcarEntrega,
  obtenerVistaPrevia,
  registrarConcepto,
  registrarRespuesta,
  reenviarInvitacion,
} from '../services/asignacionesService'
import { useInvalidarPares } from './useInvalidarPares'
import { useRevista } from '@/lib/revista/useRevista'
import type { ConceptoPar, RespuestaPar } from '@/types/par'

/** What the invitation will look like, shown before confirming the assignment. */
export function useVistaPreviaInvitacion(articuloId: string, parId: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['pares', revista, 'vista-previa', articuloId, parId],
    queryFn: () => obtenerVistaPrevia(revista, articuloId, parId),
    enabled: articuloId !== '' && parId !== '',
    retry: false,
    staleTime: 0,
  })
}

export function useAsignarPar(articuloId: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (parId: string) => asignarPar(revista, articuloId, parId),
    onSuccess: invalidar,
  })
}

export function useReenviarInvitacion() {
  const { revista } = useRevista()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: ({
      asignacionId,
      tipo,
    }: {
      asignacionId: string
      tipo: 'reenvio' | 'recordatorio'
    }) => reenviarInvitacion(revista, asignacionId, tipo),
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
