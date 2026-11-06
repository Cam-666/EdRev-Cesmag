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
