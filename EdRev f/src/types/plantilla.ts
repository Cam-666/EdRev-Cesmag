import type { Revista } from './revista'

/** What a template is used for. Each journal has exactly one template in use per use (RF-45). */
export type UsoPlantilla = 'invitacion' | 'agradecimiento' | 'constancia'

/** A template is a mail (subject and text) or a file (the constancia: text, header, footer, signature). */
export type ClasePlantilla = 'correo' | 'archivo'

/** The images of a file template. */
export type ParteImagen = 'encabezado' | 'pie' | 'firma'

export interface ImagenPlantilla {
  nombre: string
  /** Size in bytes. */
  tamano: number
}

export type ImagenesPlantilla = Record<ParteImagen, ImagenPlantilla | null>

export interface Plantilla {
  id: string
  /** Each journal has its own templates (RF-45). */
  revista: Revista
  uso: UsoPlantilla
  clase: ClasePlantilla
  nombre: string
  /** Mail subject; the constancia has none. */
  asunto: string | null
  cuerpo: string
  /** Markers that may appear, e.g. {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
  /** True for the template the system uses for this use in its journal. */
  enUso: boolean
  /** Header, footer and signature images; only the file template (constancia) has them. */
  imagenes: ImagenesPlantilla | null
}

/** A new template: a free name and its class; a mail also says which mail it is for (RNF-19). */
export interface DatosNuevaPlantilla {
  revista: Revista
  nombre: string
  clase: ClasePlantilla
  /** Only for a mail template. */
  uso?: Exclude<UsoPlantilla, 'constancia'>
}

/** Address the mails of a journal leave from: configured in the mail service, not on screen. */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
}
