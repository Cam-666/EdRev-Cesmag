import type { Usuario } from './usuario'

export interface CredencialesIngreso {
  correo: string
  contrasena: string
}

export interface RespuestaIngreso {
  usuario: Usuario
  /** Token portador. En producción es el JWT que emite el backend. */
  token: string
}

/** Cuerpo de un ingreso fallido (401 / 403 / 423). */
export interface DetalleErrorIngreso {
  motivo: 'credenciales' | 'bloqueada' | 'inhabilitada'
  intento?: number
  maximo?: number
  /** Fecha y hora ISO 8601 hasta la que la cuenta sigue bloqueada. */
  bloqueadoHasta?: string
}

export type MotivoCierre = 'manual' | 'inactividad' | 'inhabilitada'

/** Por qué se envió un enlace de contraseña: una cuenta nueva o una recuperación. */
export type MotivoEnlace = 'activacion' | 'recuperacion'

/** Lo que muestra un enlace de contraseña válido antes de escribir la contraseña nueva. */
export interface EnlaceContrasena {
  motivo: MotivoEnlace
  nombre: string
  correo: string
}

/** Por qué no se puede usar un enlace de contraseña: venció (30 minutos), ya se usó o no existe. */
export interface DetalleErrorEnlace {
  motivo: 'vencido' | 'usado' | 'invalido'
}

/**
 * Respuesta de las llamadas que envían un enlace de contraseña. La API real responde sin cuerpo; la simulada
 * devuelve `enlaceDemo` para que la demostración siga el enlace que llegaría por correo.
 */
export interface RespuestaEnvioEnlace {
  enlaceDemo?: string
}
