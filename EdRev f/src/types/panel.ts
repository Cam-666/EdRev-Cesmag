import type { EstadoAsignacion } from './par'
import type { Revista } from './revista'

/** Pending case of the alert "pares sin responder" (RF-37). */
export interface CasoSinResponder {
  asignacionId: string
  articuloId: string
  numeroOjs: string
  titulo: string
  par: string
  estado: Extract<EstadoAsignacion, 'invitado' | 'segundo-intento'>
}

export interface CasoConstanciaPendiente {
  constanciaId: string
  par: string
  articuloId: string
  numeroOjs: string
  titulo: string
  fechaEntrega: string
}

/** Dashboard of one journal: the two alerts the dependency flagged as priority, plus counters. */
export interface Tablero {
  fecha: string
  enEvaluacion: number
  aprobados: number
  sinResponder: CasoSinResponder[]
  constanciasPendientes: CasoConstanciaPendiente[]
  /** Migrated records still waiting for a correction (RF-44). */
  porCorregir: number
}

export interface ResumenRevista {
  revista: Revista
  articulos: number
  pares: number
  sinResponder: number
  constanciasPendientes: number
  porCorregir: number
}

/** Home screen across both journals (the only place allowed to show both, RF-37). */
export interface ResumenGeneral {
  fecha: string
  revistas: ResumenRevista[]
}

export type FiltroRevistaInforme = 'ambas' | Revista

export interface IndicadorRevista {
  reep: number
  ire: number
  total: number
}

export interface Informe {
  periodo: string
  etiquetaPeriodo: string
  revista: FiltroRevistaInforme
  postulados: IndicadorRevista
  aprobados: IndicadorRevista
  rechazados: IndicadorRevista
  evaluacionesEntregadas: IndicadorRevista
  constanciasEmitidas: IndicadorRevista
  diasPromedioEvaluacion: IndicadorRevista
  conceptos: {
    publicable: number
    conModificaciones: number
    noPublicable: number
    pendienteFormato: number
  }
}

export interface PeriodoInforme {
  valor: string
  etiqueta: string
}
