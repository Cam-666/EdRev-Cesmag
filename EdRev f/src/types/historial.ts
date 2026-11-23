import type { Revista } from './revista'

/**
 * Tipos de correo: la invitación, su segundo intento automático, el reenvío tras corregir una dirección rebotada o
 * fallida y el correo de agradecimiento con la constancia.
 */
export type TipoCorreo =
  | 'invitacion'
  | 'segundo-intento'
  | 'reenvio'
  | 'agradecimiento'
  | 'constancia'
  /** Un mensaje que la dependencia escribió a mano a un par o a un autor (no pertenece a un artículo). */
  | 'mensaje'

/**
 * Resultado de un correo: en cola, enviado (el servidor de correo lo aceptó), rebotado (la dirección no existe:
 * hay que corregirla) o fallido (falló el servicio de correo: hay que reintentar).
 */
export type EstadoCorreo = 'en-cola' | 'enviado' | 'rebotado' | 'fallido'

/** Lo que respondió el par a una invitación: «sin-respuesta-aun» mientras no ha respondido. */
export type RespuestaDelPar =
  'sin-respuesta-aun' | 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

export interface RespuestaAlCorreo {
  respuesta: RespuestaDelPar
  /** Cuándo respondió (o fue bloqueado por no responder); null mientras no ha respondido. */
  fecha: string | null
  /** «correo»: el par pulsó un botón del correo; «manual»: un usuario registró la respuesta. */
  medio: 'correo' | 'manual' | null
}

export interface CorreoEnviado {
  id: string
  revista: Revista
  articuloId: string
  /** La evaluación (el par en un artículo) a la que pertenece el correo. */
  asignacionId: string
  tipo: TipoCorreo
  destinatario: string
  /** Nombre de la persona a quien se escribió. */
  nombreDestinatario?: string
  /** A quién se escribió: un par evaluador o un autor (los correos de una evaluación son siempre para un par). */
  dirigidoA?: 'par' | 'autor'
  asunto: string
  fechaEnvio: string
  estado: EstadoCorreo
  /** Un correo rebotado o fallido que ya se corrigió y se reenvió (ya no requiere acción). */
  atendido: boolean
  /** La respuesta del par; solo para los correos de invitación (los demás no la tienen). */
  respuestaPar?: RespuestaAlCorreo | null
}

/** Tipos de acción de la auditoría: la misma lista del filtro «Tipo de acción». */
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

/** Quién cambió qué, y cuándo. */
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
