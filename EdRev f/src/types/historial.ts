import type { Revista } from './revista'

export interface Observacion {
  id: string
  articuloId: string
  texto: string
  /** ISO 8601 date-time, set by the system. */
  fecha: string
  /** Full name of the user who wrote it. */
  usuario: string
}

export type TipoCorreo = 'invitacion' | 'reenvio' | 'recordatorio' | 'agradecimiento'

/** `reintentado`: a failed mail whose resend (after fixing the address) already went out. */
export type EstadoCorreo = 'entregado' | 'rebotado' | 'en-cola' | 'reintentado'

export interface CorreoEnviado {
  id: string
  revista: Revista
  articuloId: string
  tipo: TipoCorreo
  destinatario: string
  asunto: string
  fechaEnvio: string
  estado: EstadoCorreo
}

export type TipoAuditoria =
  | 'registro'
  | 'edicion'
  | 'revision'
  | 'asignacion'
  | 'entrega'
  | 'constancia'
  | 'bloqueo'
  | 'fallo'
  | 'reapertura'
  | 'traslado'
  | 'observacion'

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
