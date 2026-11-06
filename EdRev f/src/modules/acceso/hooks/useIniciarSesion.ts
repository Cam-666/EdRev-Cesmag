import { useMutation } from '@tanstack/react-query'
import { iniciarSesionApi } from '../services/accesoService'
import type { CredencialesIngreso } from '@/types/acceso'

/** Login request (server state). Errors expose attempt count and lockout via ErrorApi.cuerpo. */
export function useIniciarSesion() {
  return useMutation({
    mutationFn: (credenciales: CredencialesIngreso) => iniciarSesionApi(credenciales),
  })
}
