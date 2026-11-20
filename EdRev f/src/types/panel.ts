import type { EstadoAsignacion } from './par'
import type { Revista } from './revista'

/** Caso pendiente de la alerta «pares sin responder». */
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

/** Tablero de una revista: las dos alertas que la dependencia marcó como prioridad, más contadores. */
export interface Tablero {
  fecha: string
  enEvaluacion: number
  aprobados: number
  sinResponder: CasoSinResponder[]
  constanciasPendientes: CasoConstanciaPendiente[]
  /** Registros migrados que aún esperan una corrección. */
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

/** Pantalla de Inicio de las dos revistas (el único lugar autorizado a mostrar ambas). */
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
