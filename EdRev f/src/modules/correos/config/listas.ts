/*
 * listas — labels of the mail types and results, as the sent-mail log shows them. Covers: RF-26,
 * HU-21 (the log distinguishes the invitation, the 2nd attempt, the resend after a correction and
 * the thank-you mail; results En cola, Enviado, Rebotado, Fallido).
 */
import type { EstadoCorreo, RespuestaDelPar, TipoCorreo } from '@/types/historial'

export const ETIQUETA_TIPO_CORREO: Record<TipoCorreo, string> = {
  invitacion: 'Invitación',
  'segundo-intento': '2.º intento',
  reenvio: 'Reenvío por corrección',
  agradecimiento: 'Agradecimiento',
  constancia: 'Constancia',
}

export const ETIQUETA_RESPUESTA_PAR: Record<RespuestaDelPar, string> = {
  'sin-respuesta-aun': 'Aún no ha respondido',
  acepto: 'Aceptó participar',
  'no-acepto': 'No aceptó esta invitación',
  'no-desea': 'No desea participar más (par bloqueado)',
  'sin-respuesta': 'No respondió a las invitaciones (par bloqueado)',
}

export const TIPOS_CORREO = Object.keys(ETIQUETA_TIPO_CORREO) as TipoCorreo[]

export const ESTADOS_CORREO: EstadoCorreo[] = ['en-cola', 'enviado', 'rebotado', 'fallido']
