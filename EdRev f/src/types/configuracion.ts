/*
 * Configuración — valores que ajusta la Administradora desde la página (Administración › Configuración): los
 * días que tiene un par para responder una invitación y, de cada revista, el ISSN y las indexaciones que van en
 * su constancia.
 */
import type { Revista } from './revista'

export interface DatosRevista {
  /** Con la forma 2590-7476; vacío cuando la revista no tiene. */
  issn: string
  /** Un solo texto con las indexaciones, tal como deben leerse en la constancia. */
  indexaciones: string
}

export interface Configuracion {
  /** Días antes del 2.º intento automático y, si tampoco se responde, del bloqueo. */
  diasEspera: number
  revistas: Record<Revista, DatosRevista>
}
