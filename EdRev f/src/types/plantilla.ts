import type { Revista } from './revista'

/** The three templates the dependency edits without touching code (RNF-19). */
export type PlantillaId = 'invitacion' | 'agradecimiento' | 'constancia'

export interface Plantilla {
  id: PlantillaId
  nombre: string
  /** Mail subject; the constancia has none. */
  asunto: string | null
  cuerpo: string
  /** Markers that may appear, e.g. {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
}

export interface CuentaRemitente {
  revista: Revista
  /** Provisional account in this first phase (RF-25, HU-17). */
  provisional: string
  /** Institutional account foreseen once authorized. */
  institucionalPrevista: string
  estadoInstitucional: 'pendiente-ti' | 'autorizada'
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
  cuentas: CuentaRemitente[]
}
