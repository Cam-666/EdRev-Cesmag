/*
 * politicaAcceso — access policy values shown in the design (Acceso screens).
 * Failed-attempt lockout, session timeout and recovery link rules have no RF/HU yet
 * (open item: "requisitos pendientes de incorporar"); RNF-05 only says "periodo de inactividad".
 */
export const POLITICA_ACCESO = {
  /** Failed attempts before the account is locked. */
  intentosMaximos: 3,
  /** Lock duration after the last failed attempt. */
  bloqueoMinutos: 15,
  /** Inactivity after which the session closes (RNF-05). */
  inactividadMinutos: 30,
  /** Validity of the password-recovery link. */
  enlaceCaducaMinutos: 30,
  /** Wait before the recovery link can be resent. */
  reenvioSegundos: 45,
  /** Institutional domain accepted by the login form. */
  dominioInstitucional: '@unicesmag.edu.co',
} as const
