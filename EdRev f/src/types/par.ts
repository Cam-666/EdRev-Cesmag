import type { EleccionCorreo } from './plantilla'
import type { EstadoCorreo, TipoCorreo } from './historial'
import type { Revista } from './revista'

export type MotivoBloqueo = 'sin-respuesta' | 'no-desea'

/** Par evaluador. La base de pares es común a las dos revistas. */
export interface ParEvaluador {
  id: string
  revista: Revista
  nombre: string
  /** Profesión o título académico, por ejemplo "Magíster en Educación"; va en la invitación. */
  profesion: string
  correo: string
  universidad: string
  /** Área temática de texto libre. */
  area: string
  bloqueo: { motivo: MotivoBloqueo; fecha: string } | null
}

/** Estado de un par en un artículo. `segundo-intento` es «Invitado» después del reenvío. */
export type EstadoAsignacion =
  'invitado' | 'segundo-intento' | 'acepto' | 'no-acepto' | 'sin-respuesta' | 'entrego'

export type ConceptoPar =
  'publicable' | 'publicable-con-modificaciones' | 'no-publicable' | 'pendiente-formato'

/** Lo que deciden los conceptos de los pares para el artículo: un concepto que es un juicio real. */
export type ResultadoPares = Exclude<ConceptoPar, 'pendiente-formato'>

/**
 * Un par asignado a un artículo, en orden. Como máximo tres pares que aceptaron o entregaron; los que declinan o
 * no responden no ocupan lugar. El de desempate se marca.
 */
export interface Asignacion {
  id: string
  articuloId: string
  parId: string
  /** Orden de asignación (1, 2, 3…). Los pares que no aceptaron conservan su número. */
  orden: number
  esDesempate: boolean
  estado: EstadoAsignacion
  /** Fechas ISO 8601. */
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
  /** "migrado" = vino del Excel. */
  origen: 'sistema' | 'migrado'
}

/** La asignación unida a los datos de su par, como la muestra la ficha del artículo. */
export interface AsignacionDetalle extends Asignacion {
  par: Pick<ParEvaluador, 'id' | 'nombre' | 'correo' | 'universidad'>
  constanciaEmitida: boolean
  /** La constancia de una evaluación entregada (pendiente o emitida), para emitirla desde la ficha. */
  constanciaId: string | null
  /** El último correo de invitación de este par: uno rebotado o fallido se puede reenviar. */
  ultimoCorreo: { tipo: TipoCorreo; estado: EstadoCorreo; atendido: boolean } | null
}

/** Respuesta de «Marcar entrega»: la constancia que se puede emitir de inmediato. */
export interface EntregaRegistrada extends Asignacion {
  constanciaId: string | null
}

export type EstadoDisponibilidad = 'disponible' | 'bloqueado' | 'misma-institucion'

/** Fila del listado de pares; `misma-institucion` = misma institución que un autor del artículo (no se puede asignar). */
export interface ParListado extends Pick<
  ParEvaluador,
  'id' | 'nombre' | 'correo' | 'universidad' | 'area' | 'bloqueo'
> {
  evaluaciones: number
  estado: EstadoDisponibilidad
}

export interface Participacion {
  /** Revista del artículo (la base de pares es común a las dos). */
  revista: Revista
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
  /** Fecha ISO de la última participación. */
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

export interface ResultadoAsignacion {
  asignacion: Asignacion
  /** El par asignado (el candidato nuevo, cuando se registró uno). */
  par: Pick<ParEvaluador, 'id' | 'nombre' | 'correo'>
  correo: { estado: EstadoCorreo; destinatario: string }
}

/** Cómo registra la dependencia la respuesta de un par a la invitación. */
/**
 * La respuesta del par: aceptó; no aceptó esta invitación (no se bloquea); no desea participar más (se
 * bloquea); sin respuesta tras el segundo intento (lo bloquea el sistema).
 */
export type RespuestaPar = 'acepto' | 'no-acepto' | 'no-desea' | 'sin-respuesta'

/** Un candidato nuevo escrito mientras se asignan pares. */
export interface CandidatoPar {
  nombre: string
  profesion: string
  correo: string
  universidad: string
  area: string
}

/** Cuerpo de una asignación: un par de la base, o un candidato nuevo que se guarda primero en la base. */
export type DatosAsignacion = ({ parId: string } | { nuevo: CandidatoPar }) & EleccionCorreo

