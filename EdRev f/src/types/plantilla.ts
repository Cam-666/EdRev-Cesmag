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
  /** What it is used for in its journal; null while the Administradora has not chosen one. */
  uso: UsoPlantilla | null
  clase: ClasePlantilla
  nombre: string
  /** Mail subject; the constancia has none. */
  asunto: string | null
  cuerpo: string
  /** Markers that may appear, e.g. {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
  /** True when it is the template its journal sends for its use (it has one). */
  enUso: boolean
  /** Header, footer and signature images; only the file template (constancia) has them. */
  imagenes: ImagenesPlantilla | null
  /** Footer image (signature) of a mail template; null for a file template. */
  imagenPie: ImagenPlantilla | null
  /** Email a click on the signature opens in the PDF ('' for none); null for a mail template. */
  correoFirma: string | null
}

/**
 * A new template: a free name and what it is for. It starts as a copy of the one in use for that
 * purpose; `usarAhora` makes it the one in use at once. Without a purpose it is blank and its class
 * is given.
 */
export interface DatosNuevaPlantilla {
  revista: Revista
  nombre: string
  uso?: UsoPlantilla
  clase?: ClasePlantilla
  usarAhora?: boolean
}

/** Address the mails of a journal leave from: configured in the mail service, not on screen. */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
}
