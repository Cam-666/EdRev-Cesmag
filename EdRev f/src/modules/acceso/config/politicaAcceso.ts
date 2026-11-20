/*
 * politicaAcceso — valores de la política de acceso que muestran las pantallas de acceso: la sesión se cierra tras
 * 30 minutos de inactividad; los enlaces de activación y de recuperación duran 30 minutos y sirven una sola vez;
 * y el bloqueo tras intentos fallidos.
 */
export const POLITICA_ACCESO = {
  /** Intentos fallidos antes de bloquear la cuenta. */
  intentosMaximos: 3,
  /** Duración del bloqueo después del último intento fallido. */
  bloqueoMinutos: 15,
  /** Inactividad después de la cual se cierra la sesión. */
  inactividadMinutos: 30,
  /** Vigencia de los enlaces de activación y de recuperación. */
  enlaceCaducaMinutos: 30,
  /** Longitud mínima de una contraseña nueva. */
  contrasenaMinima: 8,
  /** Espera antes de poder reenviar el enlace de recuperación. */
  reenvioSegundos: 45,
  /** Dominio institucional que acepta el formulario de ingreso. */
  dominioInstitucional: '@unicesmag.edu.co',
} as const
