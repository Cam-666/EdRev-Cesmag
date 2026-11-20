/*
 * respuestas — los enlaces de los tres botones del correo de invitación (acepto / no acepto esta invitación /
 * no deseo participar más). Cada enlace lo firma el servidor y lleva la evaluación y la respuesta; abre una
 * página que pide al par confirmar, así un antivirus de correo que abre el enlace no responde por el par.
 * El enlace deja de servir cuando la invitación ya fue respondida (el estado de la evaluación es el «un solo
 * uso») y vence a los 45 días.
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

/** La página de la aplicación que confirma la respuesta. */
export function enlaceRespuesta(idEvaluacion: number, accion: AccionCorreo): string {
  return `${config.urlFrontend}/invitacion?token=${encodeURIComponent(firmarRespuesta(idEvaluacion, accion))}`
}

const BOTONES: Array<{ accion: AccionCorreo; texto: string; color: string }> = [
  // Azul institucional, otro azul, y rojo para el que bloquea al par.
  { accion: 'acepto', texto: 'Acepto la invitación', color: '#0d47a1' },
  { accion: 'no-acepto', texto: 'No acepto esta invitación', color: '#0277bd' },
  { accion: 'no-desea', texto: 'No deseo participar más', color: '#c62828' },
]

/** Los tres botones como HTML de correo (estilos en línea: los clientes de correo ignoran las hojas de estilo). */
export function botonesHtml(idEvaluacion: number, ejemplo = false): string {
  // Bloques en línea y no una tabla: en una pantalla angosta pasan solos a la línea siguiente.
  const enlaces = BOTONES.map(
    (b) =>
      `<a href="${ejemplo ? '#' : enlaceRespuesta(idEvaluacion, b.accion)}" style="display:inline-block;background:${b.color};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;white-space:nowrap;padding:11px 14px;border-radius:6px;margin:0 8px 8px 0">${b.texto}</a>`,
  ).join('')
  return `<div style="margin:14px 0 6px">${enlaces}</div>`
}

/** Marca en que se convierte {{botones}} de la plantilla antes de escapar el texto; luego se cambia por los botones. */
export const MARCA_BOTONES = '@@BOTONES@@'
