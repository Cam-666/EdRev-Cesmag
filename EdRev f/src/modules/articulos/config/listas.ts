/*
 * listas — closed lists and thresholds of the articles module.
 * Covers: RF-01 (article types), RF-05 (15 % threshold), RF-06 (committee round results), RF-09 (max
 * authors), RF-35 (page size). Texts are the ones of the dependency's format.
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

/** Results of a round of the initial committee review (RF-06), in the dependency's words. */
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

/** States an archived article can go back to when it is reopened (HU-05). */
export const ESTADOS_REAPERTURA: Array<{ valor: 'en-revision' | 'postulado'; etiqueta: string }> = [
  { valor: 'en-revision', etiqueta: 'En revisión del comité' },
  { valor: 'postulado', etiqueta: 'Postulado' },
]

/** Concept of a peer, as the article sheet and the peer history print it. */
export const ETIQUETA_CONCEPTO: Record<ConceptoPar, string> = {
  publicable: 'Publicable',
  'publicable-con-modificaciones': 'Con modificaciones',
  'no-publicable': 'No publicable',
  'pendiente-formato': 'Pendiente formato de evaluación',
}
