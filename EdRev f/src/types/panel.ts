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
  /** Artículos aprobados por el comité que todavía no tienen pares. */
  sinPares: number
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
  /** Los artículos postulados en el semestre (para el archivo de Excel). */
  articulos: ArticuloDelInforme[]
  /** Por revista: cuántos de esos artículos se publicaron, no se publicaron o se rechazaron. */
  resultados: ResultadoRevistaInforme[]
}

export interface ArticuloDelInforme {
  revista: Revista
  numeroOjs: string
  titulo: string
  /** Los autores en el orden del artículo, separados por punto y coma. */
  autores: string
  /** Volumen y número, solo si el artículo se aprobó. */
  publicacion: { volumen: number; numero: number } | null
}

export interface ResultadoRevistaInforme {
  revista: Revista
  nombre: string
  /** Aprobados (con volumen y número). */
  publicados: number
  /** Los que siguen en proceso o se archivaron. */
  noPublicados: number
  rechazados: number
}

export interface PeriodoInforme {
  valor: string
  etiqueta: string
}
