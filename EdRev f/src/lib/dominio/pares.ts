/*
 * pares — rules about the places of the peers of an article, shared by the screens and the mock API.
 * - Only peers who accepted or delivered take one of the three places; those who decline or do
 *   not answer do not (RF-19).
 * - A peer is available when it is not blocked and has no evaluation in progress (invited or
 *   accepted) in its journal (RF-19, HU-13).
 * - An article is evaluated by two peers: once it has two (invited, accepted or delivered) no more
 *   are searched, and a third is allowed only when the concepts of the two do not coincide.
 * Covers: RF-19, RF-21, HU-13.
 */
import type { ConceptoPar, EstadoAsignacion } from '@/types/par'

export const MAX_PARES_ACTIVOS = 3

export function ocupaCupo(a: { estado: EstadoAsignacion }): boolean {
  return a.estado === 'acepto' || a.estado === 'entrego'
}

export function enCurso(a: { estado: EstadoAsignacion }): boolean {
  return a.estado === 'invitado' || a.estado === 'segundo-intento' || a.estado === 'acepto'
}

export const PARES_BASE = 2

interface AsignacionRegla {
  estado: EstadoAsignacion
  concepto: ConceptoPar | null
  esDesempate: boolean
}

/** A peer that holds a place of the article: invited, accepted or delivered. */
export function activa(a: { estado: EstadoAsignacion }): boolean {
  return a.estado !== 'no-acepto' && a.estado !== 'sin-respuesta'
}

const CONCEPTOS_REALES: readonly ConceptoPar[] = [
  'publicable',
  'publicable-con-modificaciones',
  'no-publicable',
]

/** Two delivered, real and different concepts. */
export function conceptosDifieren(a: AsignacionRegla | undefined, b: AsignacionRegla | undefined): boolean {
  return (
    a?.estado === 'entrego' &&
    b?.estado === 'entrego' &&
    !!a.concepto &&
    !!b.concepto &&
    CONCEPTOS_REALES.includes(a.concepto) &&
    CONCEPTOS_REALES.includes(b.concepto) &&
    a.concepto !== b.concepto
  )
}

export interface ReglaPares {
  /** Places taken (invited, accepted or delivered). */
  lugares: number
  /** Whether another peer can be assigned. */
  puede: boolean
  /** The next peer would be the tiebreaker (the two concepts do not coincide). */
  desempate: boolean
  /** Why no more peers are assigned, when `puede` is false. */
  motivo: string | null
}

/** `asignaciones` in assignment order (a peer who declined or did not answer holds no place). */
export function reglaPares(asignaciones: AsignacionRegla[]): ReglaPares {
  const activos = asignaciones.filter(activa)
  const lugares = activos.length
  if (lugares < PARES_BASE) return { lugares, puede: true, desempate: false, motivo: null }
  if (lugares >= MAX_PARES_ACTIVOS) {
    return { lugares, puede: false, desempate: false, motivo: 'El artículo ya tiene tres pares evaluadores' }
  }
  if (conceptosDifieren(activos[0], activos[1]) && !activos.some((a) => a.esDesempate)) {
    return { lugares, puede: true, desempate: true, motivo: null }
  }
  return {
    lugares,
    puede: false,
    desempate: false,
    motivo:
      'El artículo ya tiene 2 pares evaluadores: no se buscan más. Un tercero solo se permite cuando los conceptos de los dos pares no coinciden.',
  }
}
