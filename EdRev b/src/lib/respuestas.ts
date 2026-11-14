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
  return jwt.sign({ ev: idEvaluacion, acc: accion }, SECRETO(), { expiresIn: '45d' })
}

export function leerRespuesta(token: string): { idEvaluacion: number; accion: AccionCorreo } {
  try {
    const d = jwt.verify(token, SECRETO()) as { ev?: number; acc?: string }
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
  { accion: 'acepto', texto: 'Acepto la invitación', color: '#1b7f4b' },
  { accion: 'no-acepto', texto: 'No acepto esta invitación', color: '#475569' },
  { accion: 'no-desea', texto: 'No deseo participar más', color: '#b42318' },
]

/** The three buttons as email HTML (inline styles: mail clients ignore style sheets). */
export function botonesHtml(idEvaluacion: number): string {
  const celdas = BOTONES.map(
    (b) =>
      `<td style="padding:0 8px 8px 0"><a href="${enlaceRespuesta(idEvaluacion, b.accion)}" style="display:inline-block;background:${b.color};color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:6px">${b.texto}</a></td>`,
  ).join('')
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0"><tr>${celdas}</tr></table>`
}

/** Marker the template's {{botones}} becomes before the text is escaped; then it turns into the buttons. */
export const MARCA_BOTONES = '@@BOTONES@@'
