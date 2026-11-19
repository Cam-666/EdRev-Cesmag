/*
 * Configuración — values the Administradora adjusts from the page (Administración › Configuración):
 * the days a peer has to answer an invitation (RF-29, RF-15) and, for each journal, the ISSN and the
 * indexations that go in its constancia.
 */
import type { Revista } from './revista'

export interface DatosRevista {
  /** Like 2590-7476; empty when the journal has none. */
  issn: string
  /** One text with the indexations, as they must read in the constancia. */
  indexaciones: string
}

/** Who signs the mails of a journal; empty name means the Administradora signs (RF-25). */
export interface FirmaRevista {
  firmaNombre: string
  /** Position under the name, e.g. «Editora de la revista»; may be empty. */
  firmaCargo: string
}

export interface Configuracion {
  /** Days before the automatic 2nd attempt and, if it also goes unanswered, the block. */
  diasEspera: number
  revistas: Record<Revista, DatosRevista & FirmaRevista>
}
