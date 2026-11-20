import { useMutation, useQuery } from '@tanstack/react-query'
import { consultarEnlaceApi, definirContrasenaApi } from '../services/accesoService'

/** El enlace de activación o de recuperación que se abre desde el correo. */
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
