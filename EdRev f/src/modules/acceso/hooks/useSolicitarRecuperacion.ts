import { useMutation } from '@tanstack/react-query'
import { solicitarRecuperacionApi } from '../services/accesoService'

/** Solicitud de recuperación de contraseña. La API siempre responde 202 para que no se pueda averiguar qué cuentas existen. */
export function useSolicitarRecuperacion() {
  return useMutation({ mutationFn: (correo: string) => solicitarRecuperacionApi(correo) })
}
