import type { EstadoCorreo, TipoCorreo } from './historial'
import type { Revista } from './revista'

export type MotivoBloqueo = 'sin-respuesta' | 'no-desea'

/** Peer reviewer. Each journal has its own base, independent of the other (RF-12). */
export interface ParEvaluador {
  id: string
  revista: Revista
  nombre: string
  /** Profession or academic title, e.g. "Magíster en Educación"; it goes in the invitation (RF-25). */
  profesion: string
  correo: string
  universidad: string
  /** Free-text thematic area (RF-13). */
  area: string
  bloqueo: { motivo: MotivoBloqueo; fecha: string } | null
}

/** State of a peer in an article (RF-22). `segundo-intento` is «Invitado» after the resend. */
export type EstadoAsignacion =
  'invitado' | 'segundo-intento' | 'acepto' | 'no-acepto' | 'sin-respuesta' | 'entrego'

export type ConceptoPar =
  'publicable' | 'publicable-con-modificaciones' | 'no-publicable' | 'pendiente-formato'

/**
 * A peer assigned to an article, in order. At most three peers who accepted or delivered; those
 * who decline or do not answer take no place. The tiebreaker is flagged (RF-19, RF-21).
 */
export interface Asignacion {
  id: string
  articuloId: string
  parId: string
  /** Order of assignment (1, 2, 3…). Peers who did not accept keep their number. */
  orden: number
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
  /** The constancia of a delivered evaluation (pending or issued), to issue it from the sheet. */
  constanciaId: string | null
  /** The last invitation mail of this peer: a bounced or failed one can be resent (RF-28). */
  ultimoCorreo: { tipo: TipoCorreo; estado: EstadoCorreo; atendido: boolean } | null
}

/** Answer of «Marcar entrega»: the constancia that can be issued right away (RF-23). */
export interface EntregaRegistrada extends Asignacion {
  constanciaId: string | null
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
  profesion: string
  correo: string
  universidad: string
  area: string
}

export interface Conflicto {
  /** Human sentence, e.g. "El par y el autor X pertenecen a la Universidad CESMAG." */
  mensaje: string
}

export interface ResultadoAsignacion {
  asignacion: Asignacion
  /** The peer assigned (the new candidate, when one was registered). */
  par: Pick<ParEvaluador, 'id' | 'nombre' | 'correo'>
  /** «Conflicto posible» with an author of the article; it never blocks (RF-17). */
  conflicto: Conflicto | null
  correo: { estado: EstadoCorreo; destinatario: string }
}

/** How the dependency registers the answer of a peer to the invitation (RF-22, RF-15). */
/**
 * The peer's answer (RF-22): accepted; did not accept this invitation (not blocked); does not want
 * to take part any more (blocked); no answer after the second attempt (blocked by the system).
 */
export type RespuestaPar = 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

/** A brand-new candidate typed while assigning peers (RF-12, RF-19). */
export interface CandidatoPar {
  nombre: string
  profesion: string
  correo: string
  universidad: string
  area: string
}

/** Body of an assignment: a peer of the base, or a new candidate saved in the base first. */
export type DatosAsignacion = { parId: string } | { nuevo: CandidatoPar }

/** The same email in the base of the other journal (RF-12): its data can be copied. */
export interface ParEnOtraRevista {
  revista: Revista
  nombre: string
  profesion: string
  correo: string
  universidad: string
  area: string
  bloqueo: ParEvaluador['bloqueo']
}
