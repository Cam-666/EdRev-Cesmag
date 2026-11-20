import type { EstadoArticulo } from './articulo'
import type { Revista } from './revista'

/**
 * Ficha de un autor del directorio común de las dos revistas: un autor que vuelve a postular, en cualquiera de
 * ellas, se encuentra por nombre u ORCID y se reutiliza. `revista` es donde se usó por primera vez.
 */
export interface Autor {
  id: string
  revista: Revista
  nombre: string
  correo: string
  orcid: string
  filiacion: string
  pais: string
}

/** Un autor tal como aparece en un artículo: el orden identifica al autor principal (el primero). */
export interface AutorDeArticulo extends Autor {
  /** Posición en el artículo, empezando en 1. */
  orden: number
}

/** Datos escritos en el formulario de autor (todavía sin id). */
export type DatosAutor = Omit<Autor, 'id' | 'revista'>

/** Un artículo de un autor, en cualquiera de las dos revistas. */
export interface ArticuloDeAutor {
  id: string
  revista: Revista
  fechaPostulacion: string
  numeroOjs: string
  titulo: string
  estado: EstadoArticulo
}
