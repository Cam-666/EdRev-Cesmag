import type { Revista } from './revista'

/** What a template is used for. Each journal has exactly one template in use per use (RF-45). */
export type UsoPlantilla = 'invitacion' | 'agradecimiento' | 'constancia'

/** The PDF background of a constancia template: letterhead, design and signature (RF-30, RF-45). */
export interface FondoPdf {
  nombre: string
  /** Size in bytes. */
  tamano: number
}

export interface Plantilla {
  id: string
  /** Each journal has its own templates (RF-45). */
  revista: Revista
  uso: UsoPlantilla
  nombre: string
  /** Mail subject; the constancia has none. */
  asunto: string | null
  cuerpo: string
  /** Markers that may appear, e.g. {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
  /** True for the template the system uses for this use in its journal. */
  enUso: boolean
  /** Only the constancia has one, and it needs it. */
  fondoPdf: FondoPdf | null
}

/** A new template: its name and use; it starts from the text of the one in use (RNF-19). */
export interface DatosNuevaPlantilla {
  revista: Revista
  nombre: string
  uso: UsoPlantilla
}

/** Address the mails of a journal leave from: configured in the mail service, not on screen. */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
}
