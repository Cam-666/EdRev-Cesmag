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

export type EstadoDisponibilidad = 'disponible' | 'bloqueado' | 'conflicto'

/** Row of the peers list; `conflicto` = "Conflicto posible" (peer from Universidad CESMAG or from the author's university). */
export interface ParListado extends Pick<
  ParEvaluador,
  'id' | 'nombre' | 'correo' | 'universidad' | 'area' | 'bloqueo'
> {
  evaluaciones: number
  estado: EstadoDisponibilidad
}

export interface Participacion {
  asignacionId: string
  articuloId: string
  numeroOjs: string
  titulo: string
  estado: EstadoAsignacion
  concepto: ConceptoPar | null
  constancia: EstadoConstancia | null
  fechaInvitacion: string
  fechaEntrega: string | null
}

export interface ParDetalle extends ParEvaluador {
  evaluacionesEntregadas: number
  invitacionesSinResponder: number
  /** ISO date of the last participation. */
  ultimaParticipacion: string | null
  participaciones: Participacion[]
}

export interface NuevoPar {
  nombre: string
  correo: string
  universidad: string
  area: string
  /** RNF-06: authorization of personal-data treatment; its date is stored. */
  autorizoDatos: boolean
}

export interface Conflicto {
  /** Human sentence, e.g. "El par y el autor X pertenecen a la Universidad CESMAG." */
  mensaje: string
}

/** What the invitation mail will look like before it is sent (RF-24, RF-25). */
export interface VistaPreviaInvitacion {
  de: string
  para: string
  asunto: string
  cuerpo: string
  adjuntos: string
  orden: 1 | 2 | 3
  esDesempate: boolean
  conflicto: Conflicto | null
}

export interface ResultadoAsignacion {
  asignacion: Asignacion
  correo: { estado: 'entregado' | 'rebotado' | 'en-cola'; destinatario: string }
}

/** How the dependency registers the answer of a peer to the invitation (RF-22, RF-15). */
export type RespuestaPar = 'acepto' | 'no-acepto' | 'sin-respuesta'
