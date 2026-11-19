import { useMutation, useQuery } from '@tanstack/react-query'
import { consultarEnlaceApi, definirContrasenaApi } from '../services/accesoService'

/** The activation or recovery link opened from the mail (RF-40, RF-46). */
export function useEnlaceContrasena(token: string) {
  return useQuery({
    queryKey: ['acceso', 'enlace', token],
    queryFn: () => consultarEnlaceApi(token),
    enabled: token !== '',
    retry: false,
  })
}

export function useDefinirContrasena(token: string) {
  return useMutation({
    mutationFn: (contrasena: string) => definirContrasenaApi(token, contrasena),
  })
}
