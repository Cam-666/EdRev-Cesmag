import type { AsignacionDetalle, ResultadoPares } from './par'
import type { AutorDeArticulo, DatosAutor } from './autor'
import type { Revista } from './revista'

export type TipoArticulo = 'investigacion' | 'reflexion' | 'revision'

export type EstadoArticulo =
  'postulado' | 'en-revision' | 'en-evaluacion' | 'aprobado' | 'rechazado' | 'archivado'

/** Resultado de una ronda de la revisión inicial del comité: lista cerrada de tres. */
export type ResultadoRonda = 'aprobado' | 'rechazado' | 'ajustes'

/**
 * Una ronda de la revisión inicial del comité. No hay límite de rondas: con «Requiere ajustes» el autor corrige y
 * se registra otra ronda; las rondas nunca se sobrescriben.
 */
export interface RondaComite {
  id: string
  /** 1, 2, 3… en el orden en que se registraron. */
  numero: number
  resultado: ResultadoRonda
  observacion: string
  /** Fecha y hora ISO 8601. */
  fecha: string
  usuario: string
}

/** Volumen y número de la edición de la revista: van juntos. */
export interface Publicacion {
  volumen: number
  numero: number
}

/** Cierre del proceso de un artículo: el motivo queda en su historial. */
export interface CierreArticulo {
  estado: Extract<EstadoArticulo, 'aprobado' | 'rechazado' | 'archivado'>
  motivo: string
  /** Obligatorio cuando se aprueba. */
  publicacion: Publicacion | null
}

/** Artículo guardado. `id` es el número de OJS; los autores son ids ordenados (el primero = autor principal). */
export interface Articulo {
  id: string
  revista: Revista
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  estado: EstadoArticulo
  /** Fecha ISO 8601. */
  fechaPostulacion: string
  /** Volumen y número donde se publicará el artículo aprobado, siempre juntos. */
  publicacion: Publicacion | null
  /** Reporte antiplagio, registrado en la revisión del comité; null hasta entonces. */
  coincidencias: number | null
  /** Porcentaje atribuido a IA; nunca es causa de rechazo. */
  atribuidoIa: number | null
  /** Rondas de la revisión inicial del comité, la más antigua primero. */
  rondasComite: RondaComite[]
  autoresIds: string[]
  archivadoEn: string | null
  motivoArchivo: string | null
}

/** Fila del listado de artículos. */
export interface ArticuloListado {
  id: string
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  estado: EstadoArticulo
  fechaPostulacion: string
  publicacion: Publicacion | null
  /** Pares que entregaron su evaluación, sobre los pares asignados (los que aceptaron). */
  paresEntregaron: number
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
  /** Año de gestión: un artículo abierto de un año anterior cuenta en el actual. */
  anio?: number
  /** Fechas ISO, rango inclusivo sobre la fecha de postulación. */
  desde?: string
  hasta?: string
  /** Solo los artículos con pares que no han respondido la invitación (alerta del tablero). */
  sinResponder?: boolean
  pagina: number
  porPagina: number
}

/** Datos de la ficha del artículo: el artículo con sus autores y pares asignados ya resueltos. */
export interface ArticuloDetalle extends Omit<Articulo, 'autoresIds'> {
  autores: AutorDeArticulo[]
  asignaciones: AsignacionDetalle[]
  /** Lo que deciden los conceptos de los pares; null mientras no hayan entregado todos. */
  resultadoPares: ResultadoPares | null
  /** Cargado del Excel por la migración. */
  migrado: boolean
}

export interface NuevoArticulo {
  numeroOjs: string
  titulo: string
  tipo: TipoArticulo
  fechaPostulacion: string
  /** Ids de autores existentes o autores nuevos, en orden. */
  autores: Array<{ autorId: string } | { nuevo: DatosAutor }>
}

export interface EdicionArticulo {
  titulo?: string
  tipo?: TipoArticulo
  publicacion?: Publicacion | null
}

/** Una ronda nueva de la revisión del comité, con los porcentajes del antiplagio. */
export interface NuevaRonda {
  coincidencias: number | null
  atribuidoIa: number | null
  /** El resultado que elige el comité (la página solo sugiere uno). */
  resultado: ResultadoRonda
  observacion: string
}
