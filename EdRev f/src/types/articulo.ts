import type { AsignacionDetalle } from './par'
import type { AutorDeArticulo, DatosAutor } from './autor'
import type { Revista } from './revista'

export type TipoArticulo = 'investigacion' | 'reflexion' | 'revision'

export type EstadoArticulo =
  'postulado' | 'en-revision' | 'en-evaluacion' | 'aprobado' | 'rechazado' | 'archivado'

/** Result of a round of the initial committee review (RF-06): closed list of three. */
export type ResultadoRonda = 'aprobado' | 'rechazado' | 'ajustes'

/**
 * One round of the initial committee review. There is no limit of rounds: with «Requiere
 * ajustes» the author corrects and another round is registered; rounds are never overwritten.
 */
export interface RondaComite {
  id: string
  /** 1, 2, 3… in the order they were registered. */
  numero: number
  resultado: ResultadoRonda
  observacion: string
  /** ISO 8601 date-time. */
  fecha: string
  usuario: string
}

/** Volume and number of the journal issue (RF-04): they go together. */
export interface Publicacion {
  volumen: number
  numero: number
}

/** Closing the process of an article (RF-08): the reason stays in its history. */
export interface CierreArticulo {
  estado: Extract<EstadoArticulo, 'aprobado' | 'rechazado' | 'archivado'>
  motivo: string
  /** Required when it is approved (HU-05, criterion 2). */
  publicacion: Publicacion | null
}

/** Stored article. `id` is the OJS number; authors are ordered ids (first = main author). */
export interface Articulo {
  id: string
  revista: Revista
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  estado: EstadoArticulo
  /** ISO 8601 date. */
  fechaPostulacion: string
  /** Volume and number where the approved article will be published, always together (RF-04). */
  publicacion: Publicacion | null
  /** Anti-plagiarism report, registered in the committee review (RF-05); null until then. */
  coincidencias: number | null
  /** Percentage attributed to AI; never a cause of rejection. */
  atribuidoIa: number | null
  /** Rounds of the initial committee review, oldest first (RF-06, RF-07). */
  rondasComite: RondaComite[]
  autoresIds: string[]
  archivadoEn: string | null
  motivoArchivo: string | null
}

/** Row of the article list. */
export interface ArticuloListado {
  id: string
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  estado: EstadoArticulo
  fechaPostulacion: string
  publicacion: Publicacion | null
  /** Peers that already answered (accepted, declined or delivered) over peers assigned. */
  paresRespondieron: number
  paresAsignados: number
}

export interface RespuestaListado {
  items: ArticuloListado[]
  total: number
}

export interface FiltrosArticulos {
  q?: string
  estado?: EstadoArticulo
  publicacion?: string
  /** ISO dates, inclusive range over the postulation date (HU-26). */
  desde?: string
  hasta?: string
  /** Only articles with peers that have not answered the invitation (dashboard alert, HU-25). */
  sinResponder?: boolean
  pagina: number
  porPagina: number
}

/** Article sheet payload: the article with its authors and assigned peers resolved. */
export interface ArticuloDetalle extends Omit<Articulo, 'autoresIds'> {
  autores: AutorDeArticulo[]
  asignaciones: AsignacionDetalle[]
  totalObservaciones: number
}

export interface NuevoArticulo {
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  fechaPostulacion: string
  /** Existing author ids or brand-new authors, in order. */
  autores: Array<{ autorId: string } | { nuevo: DatosAutor }>
}

export interface EdicionArticulo {
  titulo?: string
  tipo?: TipoArticulo
  publicacion?: Publicacion | null
}

/** A new round of the committee review, with the anti-plagiarism percentages (RF-05, RF-06). */
export interface NuevaRonda {
  coincidencias: number | null
  atribuidoIa: number | null
  resultado: ResultadoRonda
  observacion: string
}
