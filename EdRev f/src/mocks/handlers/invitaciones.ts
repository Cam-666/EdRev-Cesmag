/*
 * MSW handlers of the answer from the invitation mail (public, no session): the page opened by a
 * button of the mail asks to confirm, then registers the answer. In the mock the link carries
 * `inv_<asignación>__<acción>`; the real API signs it. Covers: RF-22, RF-15, RF-24.
 */
import { http, HttpResponse } from 'msw'
import { baseDe } from '../db'
import { NOMBRE_EN_CORREO } from '../plantillas'
import { aplicarRespuestaMock } from './asignaciones'
import { error } from './util'
import type { AccionCorreo, InvitacionCorreo } from '@/types/invitacion'
import type { Revista } from '@/types/revista'

const ACCIONES: readonly AccionCorreo[] = ['acepto', 'no-acepto', 'no-desea']

/** The link of a button of the mail (mock format). */
export function tokenInvitacion(asignacionId: string, accion: AccionCorreo): string {
  return `inv_${asignacionId}__${accion}`
}

function buscar(token: string) {
  const [id, accion] = token.replace(/^inv_/, '').split('__')
  if (!token.startsWith('inv_') || !id || !ACCIONES.includes(accion as AccionCorreo)) return null
  for (const revista of ['reep', 'ire'] as Revista[]) {
    const base = baseDe(revista)
    const asignacion = base.asignaciones.find((a) => a.id === id)
    const par = base.pares.find((p) => p.id === asignacion?.parId)
    const articulo = base.articulos.find((a) => a.id === asignacion?.articuloId)
    if (asignacion && par && articulo) {
      return { base, revista, asignacion, par, articulo, accion: accion as AccionCorreo }
    }
  }
  return null
}

export const handlersInvitaciones = [
  http.get('*/api/invitaciones/:token', ({ params }) => {
    const x = buscar(String(params.token))
    if (!x) return error(404, 'Enlace no válido', { motivo: 'invalido' })
    const cuerpo: InvitacionCorreo = {
      accion: x.accion,
      revista: NOMBRE_EN_CORREO[x.revista],
      sigla: x.revista,
      articulo: x.articulo.titulo,
      par: x.par.nombre,
      respondida: x.asignacion.estado !== 'invitado' && x.asignacion.estado !== 'segundo-intento',
    }
    return HttpResponse.json(cuerpo)
  }),

  http.post('*/api/invitaciones/:token', ({ params }) => {
    const x = buscar(String(params.token))
    if (!x) return error(404, 'Enlace no válido', { motivo: 'invalido' })
    const fallo = aplicarRespuestaMock(x.base, x.revista, x.asignacion, x.par, x.accion, 'Sistema', true)
    if (fallo) return error(fallo.estado, fallo.mensaje)
    return HttpResponse.json({ accion: x.accion })
  }),
]
