import type { Revista } from './revista'

/** Author record, reusable across articles of the same journal (RF-10). Never shared between journals. */
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
