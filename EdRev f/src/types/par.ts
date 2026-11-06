import type { Revista } from './revista'

export type MotivoBloqueo = 'sin-respuesta' | 'no-desea'

/** Peer reviewer. Each journal has its own base, independent of the other (RF-12). */
export interface ParEvaluador {
  id: string
  revista: Revista
  nombre: string
  correo: string
  universidad: string
  /** Free-text thematic area (RF-13). */
  area: string
  bloqueo: { motivo: MotivoBloqueo; fecha: string } | null
  /** ISO date of the data-treatment authorization (RNF-06). */
  autorizoDatosEn: string | null
}

export type EstadoAsignacion = 'invitado' | 'segundo-intento' | 'acepto' | 'no-acepto' | 'entrego'

export type ConceptoPar = 'publicable' | 'publicable-con-modificaciones' | 'no-publicable'

/** A peer assigned to an article, in order (max 3); the third can be the tiebreaker (RF-19, RF-21). */
export interface Asignacion {
  id: string
  articuloId: string
  parId: string
  orden: 1 | 2 | 3
  esDesempate: boolean
  estado: EstadoAsignacion
  /** ISO 8601 dates. */
  fechaInvitacion: string
  fechaRespuesta: string | null
  fechaEntrega: string | null
  intento: number
  concepto: ConceptoPar | null
}

export type EstadoConstancia = 'pendiente' | 'emitida'

export interface Constancia {
  id: string
  asignacionId: string
  estado: EstadoConstancia
  fechaEmision: string | null
  /** "migrado" = came from the Excel (outside this version's scope but kept as data). */
  origen: 'sistema' | 'migrado'
}

/** Assignment joined with the data of its peer, as the article sheet shows it. */
export interface AsignacionDetalle extends Asignacion {
  par: Pick<ParEvaluador, 'id' | 'nombre' | 'correo' | 'universidad'>
  constanciaEmitida: boolean
}
