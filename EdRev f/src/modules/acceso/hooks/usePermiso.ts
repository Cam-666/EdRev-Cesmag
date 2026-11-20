import { useSesion } from './useSesion'
import { puede } from '../config/permisos'
import type { Accion } from '../config/permisos'

/** Si el usuario actual puede hacer la acción (sirve para ocultar o desactivar controles). */
export function usePermiso(accion: Accion): boolean {
  const { usuario } = useSesion()
  return usuario !== null && puede(usuario.perfil, accion)
}
