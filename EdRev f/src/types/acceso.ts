import type { Usuario } from './usuario'

export interface CredencialesIngreso {
  correo: string
  contrasena: string
}

export interface RespuestaIngreso {
  usuario: Usuario
  /** Bearer token. In production it is the JWT issued by the backend. */
  token: string
}

/** Body of a failed login (401 / 403 / 423). */
export interface DetalleErrorIngreso {
  motivo: 'credenciales' | 'bloqueada' | 'inhabilitada'
  intento?: number
  maximo?: number
  /** ISO 8601 date-time until which the account stays locked. */
  bloqueadoHasta?: string
}

export type MotivoCierre = 'manual' | 'inactividad'

/** Why a password link was sent: a new account (RF-40) or a recovery (RF-46). */
export type MotivoEnlace = 'activacion' | 'recuperacion'

/** What a valid password link shows before the new password is typed. */
export interface EnlaceContrasena {
  motivo: MotivoEnlace
  nombre: string
  correo: string
}

/** Why a password link cannot be used: it expired (30 minutes), was used, or does not exist. */
export interface DetalleErrorEnlace {
  motivo: 'vencido' | 'usado' | 'invalido'
}

/**
 * Answer of the calls that send a password link. The real API answers without a body; the mock
 * returns `enlaceDemo` so the demo can follow the link that would arrive by mail.
 */
export interface RespuestaEnvioEnlace {
  enlaceDemo?: string
}
