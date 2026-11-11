import type { Revista } from './revista'

/** What a template is used for. Each use has exactly one template in use at a time. */
export type UsoPlantilla = 'invitacion' | 'agradecimiento' | 'constancia'

export interface Plantilla {
  /** The three base templates keep their use as id; new ones get a generated id. */
  id: string
  uso: UsoPlantilla
  nombre: string
  /** Mail subject; the constancia has none. */
  asunto: string | null
  cuerpo: string
  /** Markers that may appear, e.g. {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
  /** True for the template the system uses when it sends this kind of mail / constancia. */
  enUso: boolean
}

/** A new template: its name and use; it starts from the text of the one in use (RNF-19). */
export interface DatosNuevaPlantilla {
  nombre: string
  uso: UsoPlantilla
}

/** Address the mails of a journal leave from (a verified sender in the mail service). */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
  cuentas: CuentaRemitente[]
}
