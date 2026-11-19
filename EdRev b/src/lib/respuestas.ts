/*
 * respuestas — the links of the three buttons of the invitation mail (acepto / no acepto esta
 * invitación / no desea participar más). Each link is signed by the server and carries the
 * evaluation and the answer; it opens a page that asks the peer to confirm, so a mail scanner that
 * opens the link does not answer for the peer. The link stops working once the invitation is
 * answered (the state of the evaluation is the single use) and expires after 45 days.
 */
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { ErrorHttp } from './http.js'

export type AccionCorreo = 'acepto' | 'no-acepto' | 'no-desea'
export const ACCIONES_CORREO: readonly AccionCorreo[] = ['acepto', 'no-acepto', 'no-desea']

const SECRETO = () => `${config.jwtSecreto}:respuestas`

export function firmarRespuesta(idEvaluacion: number, accion: AccionCorreo): string {
  return jwt.sign({ ev: idEvaluacion, acc: accion }, SECRETO(), { algorithm: 'HS256', expiresIn: '45d' })
}

export function leerRespuesta(token: string): { idEvaluacion: number; accion: AccionCorreo } {
  try {
    const d = jwt.verify(token, SECRETO(), { algorithms: ['HS256'] }) as { ev?: number; acc?: string }
    if (typeof d.ev !== 'number' || !ACCIONES_CORREO.includes(d.acc as AccionCorreo)) throw new Error('forma')
    return { idEvaluacion: d.ev, accion: d.acc as AccionCorreo }
  } catch (e) {
    const vencido = (e as Error).name === 'TokenExpiredError'
    throw new ErrorHttp(vencido ? 410 : 404, 'Enlace no válido', { motivo: vencido ? 'vencido' : 'invalido' })
  }
}

/** The page of the app that confirms the answer. */
export function enlaceRespuesta(idEvaluacion: number, accion: AccionCorreo): string {
  return `${config.urlFrontend}/invitacion?token=${encodeURIComponent(firmarRespuesta(idEvaluacion, accion))}`
}

const BOTONES: Array<{ accion: AccionCorreo; texto: string; color: string }> = [
  // Institutional blue, another blue, and red for the one that blocks the peer.
  { accion: 'acepto', texto: 'Acepto la invitación', color: '#0d47a1' },
  { accion: 'no-acepto', texto: 'No acepto esta invitación', color: '#0277bd' },
  { accion: 'no-desea', texto: 'No deseo participar más', color: '#c62828' },
]

/** The three buttons as email HTML (inline styles: mail clients ignore style sheets). */
export function botonesHtml(idEvaluacion: number, ejemplo = false): string {
  // Inline blocks, not a table: on a narrow screen they wrap onto the next line by themselves.
  const enlaces = BOTONES.map(
    (b) =>
      `<a href="${ejemplo ? '#' : enlaceRespuesta(idEvaluacion, b.accion)}" style="display:inline-block;background:${b.color};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;white-space:nowrap;padding:11px 14px;border-radius:6px;margin:0 8px 8px 0">${b.texto}</a>`,
  ).join('')
  return `<div style="margin:14px 0 6px">${enlaces}</div>`
}

/** Marker the template's {{botones}} becomes before the text is escaped; then it turns into the buttons. */
export const MARCA_BOTONES = '@@BOTONES@@'
