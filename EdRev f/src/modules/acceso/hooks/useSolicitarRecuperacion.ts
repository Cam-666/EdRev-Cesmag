import { useMutation } from '@tanstack/react-query'
import { solicitarRecuperacionApi } from '../services/accesoService'

/** Password-recovery request. The API always answers 202 so accounts cannot be enumerated. */
export function useSolicitarRecuperacion() {
  return useMutation({ mutationFn: (correo: string) => solicitarRecuperacionApi(correo) })
}
