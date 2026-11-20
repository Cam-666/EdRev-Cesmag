/*
 * listas — listas cerradas y umbrales del módulo de artículos: tipos de artículo, umbral del 15 % de coincidencias,
 * resultados de una ronda del comité, máximo de autores y tamaño de página. Los textos son los del formato de la
 * dependencia.
 */
import type { EstadoArticulo, ResultadoRonda, TipoArticulo } from '@/types/articulo'
import type { ConceptoPar } from '@/types/par'

export const UMBRAL_COINCIDENCIAS = 15
export const MAX_AUTORES = 7
export const MAX_PARES = 3
export const POR_PAGINA = 6

export const TIPOS_ARTICULO: Array<{ valor: TipoArticulo; etiqueta: string }> = [
  { valor: 'investigacion', etiqueta: 'Investigación' },
  { valor: 'reflexion', etiqueta: 'Reflexión' },
  { valor: 'revision', etiqueta: 'Revisión' },
]

export const ETIQUETA_TIPO: Record<TipoArticulo, string> = {
  investigacion: 'Investigación',
  reflexion: 'Reflexión',
  revision: 'Revisión',
}

/** Resultados de una ronda de la revisión inicial del comité, con las palabras de la dependencia. */
export const RESULTADOS_RONDA: Array<{ valor: ResultadoRonda; etiqueta: string }> = [
  { valor: 'aprobado', etiqueta: 'Aprobado' },
  { valor: 'ajustes', etiqueta: 'Requiere ajustes' },
  { valor: 'rechazado', etiqueta: 'Rechazado' },
]

export const ETIQUETA_RONDA: Record<ResultadoRonda, string> = {
  aprobado: 'Aprobado',
  ajustes: 'Requiere ajustes',
  rechazado: 'Rechazado',
}

export const ESTADOS_FILTRO: EstadoArticulo[] = [
  'postulado',
  'en-revision',
  'en-evaluacion',
  'aprobado',
  'rechazado',
  'archivado',
]

/** Estados a los que puede volver un artículo archivado cuando se reabre. */
export const ESTADOS_REAPERTURA: Array<{ valor: 'en-revision' | 'postulado'; etiqueta: string }> = [
  { valor: 'en-revision', etiqueta: 'En revisión del comité' },
  { valor: 'postulado', etiqueta: 'Postulado' },
]

/** Concepto de un par, tal como lo imprimen la ficha del artículo y el historial del par. */
export const ETIQUETA_CONCEPTO: Record<ConceptoPar, string> = {
  publicable: 'Publicable',
  'publicable-con-modificaciones': 'Con modificaciones',
  'no-publicable': 'No publicable',
  'pendiente-formato': 'Pendiente formato de evaluación',
}
