/*
 * Configuración — values the Administradora adjusts from the page (Administración › Configuración).
 * For now: the days a peer has to answer an invitation (RF-29, RF-15).
 */
export interface Configuracion {
  /** Days before the automatic 2nd attempt and, if it also goes unanswered, the block. */
  diasEspera: number
}
