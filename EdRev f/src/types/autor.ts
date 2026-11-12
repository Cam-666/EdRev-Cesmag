import type { EstadoArticulo } from './articulo'
import type { Revista } from './revista'

/**
 * Author record of the common directory of both journals (RF-10): an author who submits again,
 * in either journal, is found by name or ORCID and reused. `revista` is where it was first used.
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

/** An author as listed in an article: the order identifies the main author (first). */
export interface AutorDeArticulo extends Autor {
  /** 1-based position in the article. */
  orden: number
}

/** Data typed in the author form (no id yet). */
export type DatosAutor = Omit<Autor, 'id' | 'revista'>

/** An article of an author, in either journal (RF-11). */
export interface ArticuloDeAutor {
  id: string
  revista: Revista
  fechaPostulacion: string
  numeroOjs: string
  titulo: string
  estado: EstadoArticulo
}
