/*
 * politicaAcceso — access policy values shown in the access screens. RNF-05: the session closes
 * after 30 minutes of inactivity; RF-40 / RF-46 / RNF-04: the activation and recovery links last
 * 30 minutes and work once. The lockout after failed attempts is kept from the design.
 */
export const POLITICA_ACCESO = {
  /** Failed attempts before the account is locked. */
  intentosMaximos: 3,
  /** Lock duration after the last failed attempt. */
  bloqueoMinutos: 15,
  /** Inactivity after which the session closes (RNF-05). */
  inactividadMinutos: 30,
  /** Validity of the activation and recovery links (RF-40, RF-46). */
  enlaceCaducaMinutos: 30,
  /** Minimum length of a new password. */
  contrasenaMinima: 8,
  /** Wait before the recovery link can be resent. */
  reenvioSegundos: 45,
  /** Institutional domain accepted by the login form. */
  dominioInstitucional: '@unicesmag.edu.co',
} as const
