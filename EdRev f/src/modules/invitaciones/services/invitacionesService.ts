/*
 * invitacionesService — llamadas públicas de la página que abre un botón del correo: para qué sirve el enlace y
 * la confirmación que registra la respuesta.
 */
import { solicitar } from '@/lib/api/cliente'
import type { AccionCorreo, InvitacionCorreo } from '@/types/invitacion'

export function obtenerInvitacion(token: string): Promise<InvitacionCorreo> {
  return solicitar<InvitacionCorreo>(`/invitaciones/${encodeURIComponent(token)}`)
}

export function confirmarRespuesta(token: string): Promise<{ accion: AccionCorreo }> {
  return solicitar<{ accion: AccionCorreo }>(`/invitaciones/${encodeURIComponent(token)}`, {
    method: 'POST',
  })
}
