import { useSesion } from './useSesion'
import { puede } from '../config/permisos'
import type { Accion } from '../config/permisos'

/** Whether the current user may perform the action (use it to hide or disable controls). */
export function usePermiso(accion: Accion): boolean {
  const { usuario } = useSesion()
  return usuario !== null && puede(usuario.perfil, accion)
}
