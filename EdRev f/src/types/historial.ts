import type { Revista } from './revista'

/**
 * Mail types (RF-26, HU-21): the invitation, its automatic second attempt (RF-29), the resend after
 * correcting a bounced or failed address (RF-28) and the thank-you mail with the constancia.
 */
export type TipoCorreo = 'invitacion' | 'segundo-intento' | 'reenvio' | 'agradecimiento' | 'constancia'

/**
 * Result of a mail (RF-26, D12): queued, sent (the mail server accepted it), bounced (the address
 * does not exist: correct it) or failed (the mail service failed: retry it).
 */
export type EstadoCorreo = 'en-cola' | 'enviado' | 'rebotado' | 'fallido'

/** What the peer answered to an invitation: «sin-respuesta-aun» while it has not answered. */
export type RespuestaDelPar =
  'sin-respuesta-aun' | 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

export interface RespuestaAlCorreo {
  respuesta: RespuestaDelPar
  /** When it answered (or was blocked for not answering); null while it has not answered. */
  fecha: string | null
  /** «correo»: the peer pressed a button of the mail; «manual»: a user registered the answer. */
  medio: 'correo' | 'manual' | null
}

export interface CorreoEnviado {
  id: string
  revista: Revista
  articuloId: string
  /** The evaluation (peer in an article) the mail belongs to. */
  asignacionId: string
  tipo: TipoCorreo
  destinatario: string
  asunto: string
  fechaEnvio: string
  estado: EstadoCorreo
  /** A bounced or failed mail that was already corrected and resent (it no longer needs action). */
  atendido: boolean
  /** The answer of the peer; only for the invitation mails (the others have none). */
  respuestaPar?: RespuestaAlCorreo | null
}

/** Audit action types (RF-41, D13): the same list as the «Tipo de acción» filter. */
export type TipoAuditoria =
  | 'registro'
  | 'edicion'
  | 'revision'
  | 'asignacion'
  | 'respuesta'
  | 'entrega'
  | 'constancia'
  | 'envio'
  | 'fallo'
  | 'bloqueo'
  | 'desbloqueo'
  | 'traslado'
  | 'cierre'
  | 'reapertura'
  | 'migracion'
  | 'eliminacion'

/** Who changed what, and when (RF-41). */
export interface EntradaAuditoria {
  id: string
  revista: Revista
  articuloId: string | null
  tipo: TipoAuditoria
  accion: string
  fecha: string
  usuario: string
}

export interface HistorialArticulo {
  correos: CorreoEnviado[]
  auditoria: EntradaAuditoria[]
}
