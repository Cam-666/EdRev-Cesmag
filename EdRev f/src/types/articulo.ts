import type { AsignacionDetalle } from './par'
import type { AutorDeArticulo, DatosAutor } from './autor'
import type { Revista } from './revista'

export type TipoArticulo = 'investigacion' | 'reflexion' | 'revision'

export type EstadoArticulo =
  'postulado' | 'en-revision' | 'en-evaluacion' | 'aprobado' | 'rechazado' | 'archivado'

/** The six committee results of the dependency's format (RF-06). */
export type ResultadoComite =
  | 'sin-modificaciones'
  | 'modificaciones-basicas'
  | 'pasa-a-pares'
  | 'faltan-documentos'
  | 'no-publicable'
  | 'publicable-siea'

export type EtapaRevision = 'inicial' | 'final'

export interface RevisionComite {
  resultado: ResultadoComite
  observacion: string
  /** ISO 8601 date-time. */
  fecha: string
  usuario: string
}

/** The two percentages of the anti-plagiarism report, delivered separately (RF-05). */
export interface Antiplagio {
  coincidencias: number
  atribuidoIa: number
  observacion: string
  fecha: string
  usuario: string
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
  /** Journal issue where the approved article will be published, e.g. "Vol. 10 n.º 2" (RF-04). */
  numeroPublicacion: string | null
  antiplagio: Antiplagio | null
  revisionInicial: RevisionComite | null
  revisionFinal: RevisionComite | null
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
  numeroPublicacion: string | null
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
  numeroPublicacion?: string | null
}

export interface RegistroRevision {
  /** Anti-plagiarism report; omit to leave it untouched. */
  antiplagio?: { coincidencias: number; atribuidoIa: number; observacion: string }
  /** Committee review; omit to leave it untouched. */
  revision?: { etapa: EtapaRevision; resultado: ResultadoComite; observacion: string }
}
