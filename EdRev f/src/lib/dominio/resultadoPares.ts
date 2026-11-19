/*
 * resultadoPares — what the concepts of the peers decide for an article, shared by the screens and
 * the mock API so what the page shows and what the server does never disagree.
 * Once every peer that holds a place has delivered a real concept and most of them coincide, that
 * concept is the result (with two peers both must coincide; a third settles a disagreement):
 * - «No publicable»: the process is closed and the article is «Rechazado».
 * - «Publicable con modificaciones»: the article goes back to the committee for a new round.
 * - «Publicable»: the article is approved; it needs the volume and number of the publication.
 * Covers: RF-20, RF-21, HU-14.
 */
import { PARES_BASE } from './pares'
import type { ConceptoPar, EstadoAsignacion, ResultadoPares } from '@/types/par'

const REALES: readonly ResultadoPares[] = ['publicable', 'publicable-con-modificaciones', 'no-publicable']

export function resultadoDePares(
  asignaciones: Array<{ estado: EstadoAsignacion; concepto: ConceptoPar | null }>,
): ResultadoPares | null {
  const vigentes = asignaciones.filter(
    (a) => a.estado === 'invitado' || a.estado === 'segundo-intento' || a.estado === 'acepto' || a.estado === 'entrego',
  )
  if (vigentes.length < PARES_BASE) return null
  const conceptos: ResultadoPares[] = []
  for (const a of vigentes) {
    const c = REALES.find((r) => r === a.concepto)
    if (a.estado !== 'entrego' || !c) return null
    conceptos.push(c)
  }
  return REALES.find((r) => conceptos.filter((c) => c === r).length * 2 > conceptos.length) ?? null
}

/** Message of the sheet for each result. */
export const TEXTO_RESULTADO: Record<ResultadoPares, string> = {
  'no-publicable':
    'Los pares evaluadores calificaron el artículo como no publicable. El proceso se cerró y el artículo quedó rechazado.',
  'publicable-con-modificaciones':
    'Los pares evaluadores calificaron el artículo como publicable con modificaciones sustanciales. Con su constancia termina la participación de los pares; el artículo pasa a una nueva ronda del comité editorial, que verificará si los autores corrigieron el artículo y decidirá si se aprueba su publicación.',
  publicable:
    'Los pares evaluadores calificaron el artículo como publicable. Asigne el volumen y el número para cerrar el proceso como aprobado.',
}
