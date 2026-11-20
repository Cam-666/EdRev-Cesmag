import { useMutation } from '@tanstack/react-query'
import { iniciarSesionApi } from '../services/accesoService'
import type { CredencialesIngreso } from '@/types/acceso'

/** Petición de ingreso (estado del servidor). Los errores exponen el número de intentos y el bloqueo en ErrorApi.cuerpo. */
export function useIniciarSesion() {
  return useMutation({
    mutationFn: (credenciales: CredencialesIngreso) => iniciarSesionApi(credenciales),
  })
}
