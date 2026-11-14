/*
 * invitacionesService — public calls of the page a mail button opens: what the link is for and
 * the confirmation that registers the answer. Covers: RF-22, RF-15.
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
