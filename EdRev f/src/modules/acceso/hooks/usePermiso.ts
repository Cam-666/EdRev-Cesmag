import { useSesion } from './useSesion'
import { puede } from '../permisos'
import type { Accion } from '../permisos'

/** Whether the current user may perform the action (use it to hide or disable controls). */
export function usePermiso(accion: Accion): boolean {
  const { usuario } = useSesion()
  return usuario !== null && puede(usuario.perfil, accion)
}
