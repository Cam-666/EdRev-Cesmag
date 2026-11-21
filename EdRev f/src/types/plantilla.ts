import type { Revista } from './revista'

/** Para qué se usa una plantilla. Cada revista tiene exactamente una plantilla en uso por cada uso. */
export type UsoPlantilla = 'invitacion' | 'agradecimiento' | 'constancia'

/**
 * Para qué se creó una plantilla: uno de los tres usos automáticos, o «mensaje» (un correo que la dependencia escribe
 * a mano a un par o a un autor; esas plantillas nunca están «en uso»: se eligen al enviar el correo).
 */
export type FinPlantilla = UsoPlantilla | 'mensaje'

/** Una plantilla es un correo (asunto y texto) o un archivo (la constancia: texto, encabezado, pie y firma). */
export type ClasePlantilla = 'correo' | 'archivo'

/** Las imágenes de una plantilla de archivo. */
export type ParteImagen = 'encabezado' | 'pie' | 'firma'

export interface ImagenPlantilla {
  nombre: string
  /** Tamaño en bytes. */
  tamano: number
}

export type ImagenesPlantilla = Record<ParteImagen, ImagenPlantilla | null>

export interface Plantilla {
  id: string
  /** Cada revista tiene sus propias plantillas. */
  revista: Revista
  /** Para qué se usa ahora en su revista; null mientras no está en uso. */
  uso: UsoPlantilla | null
  /** Para qué se creó (invitación, agradecimiento, constancia o mensaje); no cambia. */
  fin: FinPlantilla
  clase: ClasePlantilla
  nombre: string
  /** Asunto del correo; la constancia no tiene. */
  asunto: string | null
  cuerpo: string
  /** Marcas que pueden aparecer, por ejemplo {{revista}}, {{par}}, {{articulo}}. */
  variables: string[]
  /** Verdadero cuando es la plantilla que su revista envía para su uso (tiene uno). */
  enUso: boolean
  /** Imágenes de encabezado, pie y firma; solo las tiene la plantilla de archivo (la constancia). */
  imagenes: ImagenesPlantilla | null
}

/** Una plantilla nueva pide su revista, su nombre y para qué es; la constancia ya existe y no se crea. */
export interface DatosNuevaPlantilla {
  revista: Revista
  nombre: string
  fin: Exclude<FinPlantilla, 'constancia'>
}

/** Una plantilla de invitación o de agradecimiento que se ofrece al asignar un par o emitir una constancia. */
export interface PlantillaDeEnvio {
  id: string
  nombre: string
  /** La que sale elegida de entrada. */
  predeterminada: boolean
  asunto: string
  cuerpo: string
  variables: string[]
}

/** Lo que se elige al enviar: la plantilla y, si se editó, su texto solo para ese envío. */
export interface EleccionCorreo {
  plantillaId?: string
  asunto?: string
  cuerpo?: string
}

/** Dirección desde la que salen los correos de una revista: se configura en el servicio de correo, no en pantalla. */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
}
