/*
 * listas — nombres de los tipos y resultados de los correos, como los muestra el registro de correos enviados.
 * El registro distingue la invitación, el 2.º intento, el reenvío por corrección y el correo de agradecimiento;
 * los resultados son En cola, Enviado, Rebotado y Fallido.
 */
import type { EstadoCorreo, RespuestaDelPar, TipoCorreo } from '@/types/historial'

export const ETIQUETA_TIPO_CORREO: Record<TipoCorreo, string> = {
  invitacion: 'Invitación',
  'segundo-intento': '2.º intento',
  reenvio: 'Reenvío por corrección',
  agradecimiento: 'Agradecimiento',
  constancia: 'Constancia',
  mensaje: 'Mensaje',
}

export const ETIQUETA_RESPUESTA_PAR: Record<RespuestaDelPar, string> = {
  'sin-respuesta-aun': 'Aún no ha respondido',
  acepto: 'Aceptó participar',
  'no-acepto': 'No aceptó esta invitación',
  'no-desea': 'No desea participar más (par bloqueado)',
  'sin-respuesta': 'No respondió a las invitaciones (par bloqueado)',
}

/** A quién se escribió el correo. */
export const ETIQUETA_DIRIGIDO_A = { par: 'Par evaluador', autor: 'Autor' } as const

export const TIPOS_CORREO = Object.keys(ETIQUETA_TIPO_CORREO) as TipoCorreo[]

export const ESTADOS_CORREO: EstadoCorreo[] = ['en-cola', 'enviado', 'rebotado', 'fallido']
