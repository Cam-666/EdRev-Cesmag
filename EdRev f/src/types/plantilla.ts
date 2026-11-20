import type { Revista } from './revista'

/** Para qué se usa una plantilla. Cada revista tiene exactamente una plantilla en uso por cada uso. */
export type UsoPlantilla = 'invitacion' | 'agradecimiento' | 'constancia'

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
  /** Para qué se creó (invitación, agradecimiento o constancia); no cambia. */
  fin: UsoPlantilla
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

/**
 * Una plantilla nueva: un nombre libre y para qué sirve. Siempre nace en blanco (la persona la escribe) y se elige
 * en Configuración cuando ya tiene texto. Sin un fin, se indica su clase.
 */
export interface DatosNuevaPlantilla {
  revista: Revista
  nombre: string
  uso?: UsoPlantilla
  clase?: ClasePlantilla
}

/** Dirección desde la que salen los correos de una revista: se configura en el servicio de correo, no en pantalla. */
export interface CuentaRemitente {
  revista: Revista
  remitente: string
}

export interface DatosPlantillas {
  plantillas: Plantilla[]
}
