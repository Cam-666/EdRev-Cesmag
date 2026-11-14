import { useMutation, useQuery } from '@tanstack/react-query'
import { confirmarRespuesta, obtenerInvitacion } from '../services/invitacionesService'

export function useInvitacion(token: string) {
  return useQuery({
    queryKey: ['invitacion', token],
    queryFn: () => obtenerInvitacion(token),
    enabled: token !== '',
    retry: false,
  })
}

export function useConfirmarRespuesta(token: string) {
  return useMutation({ mutationFn: () => confirmarRespuesta(token) })
}
