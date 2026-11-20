/*
 * Invitación respondida desde el correo — los tres botones de la invitación: acepto, no acepto esta invitación y
 * no deseo participar más.
 */
import type { Revista } from './revista'

export type AccionCorreo = 'acepto' | 'no-acepto' | 'no-desea'

/** Lo que muestra la página de confirmación para el enlace que abrió el par. */
export interface InvitacionCorreo {
  accion: AccionCorreo
  /** Nombre de la revista. */
  revista: string
  sigla: Revista
  articulo: string
  par: string
  /** La invitación ya tiene una respuesta: el enlace ya no aplica. */
  respondida: boolean
}
