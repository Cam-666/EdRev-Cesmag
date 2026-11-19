/*
 * paresArticulo — how many peers an article takes and when a third one is allowed (RF-19, RF-21).
 * An article is evaluated by two peers; the profesora's rule: once it has two (invited, accepted
 * or delivered) no more are searched, and a third is allowed only when the concepts of the two
 * peers do not coincide (tiebreaker). The absolute limit is three.
 */
export const PARES_BASE = 2
export const PARES_MAXIMO = 3

export interface FilaPar {
  estado_par: string
  concepto: string | null
  es_desempate?: boolean
}

const CONCEPTOS_REALES = ['publicable', 'con-modificaciones', 'no-publicable']

/** Two delivered concepts that are real and different. */
export function difieren(a: FilaPar | undefined, b: FilaPar | undefined): boolean {
  return (
    !!a?.concepto &&
    !!b?.concepto &&
    a.estado_par === 'entrego' &&
    b.estado_par === 'entrego' &&
    CONCEPTOS_REALES.includes(a.concepto) &&
    CONCEPTOS_REALES.includes(b.concepto) &&
    a.concepto !== b.concepto
  )
}

export type ResultadoPares = 'publicable' | 'con-modificaciones' | 'no-publicable'

/**
 * What the concepts of the peers decide for the article (RF-20, RF-21): once every peer that holds
 * a place has delivered a real concept and most of them coincide, that concept is the result.
 * With two peers both must coincide; a third (tiebreaker) settles a disagreement by majority.
 * `null` while someone has not delivered yet, while the two peers disagree (a third is awaited) or
 * when no concept has a majority (the committee decides).
 */
export function resultadoDePares(filas: FilaPar[]): ResultadoPares | null {
  const vigentes = filas.filter((f) => ['invitado', 'acepto', 'entrego'].includes(f.estado_par))
  if (vigentes.length < PARES_BASE) return null
  const conceptos: string[] = []
  for (const f of vigentes) {
    if (f.estado_par !== 'entrego' || !f.concepto || !CONCEPTOS_REALES.includes(f.concepto)) return null
    conceptos.push(f.concepto)
  }
  for (const c of CONCEPTOS_REALES) {
    if (conceptos.filter((x) => x === c).length * 2 > conceptos.length) return c as ResultadoPares
  }
  return null
}

/** `activos`: the evaluations in progress or delivered (invited, accepted, delivered), in order. */
export function reglaPares(activos: FilaPar[]): { lugares: number; puede: boolean; desempate: boolean; motivo: string | null } {
  const lugares = activos.length
  if (lugares < PARES_BASE) return { lugares, puede: true, desempate: false, motivo: null }
  if (lugares >= PARES_MAXIMO) {
    return { lugares, puede: false, desempate: false, motivo: 'El artículo ya tiene tres pares evaluadores' }
  }
  if (difieren(activos[0], activos[1]) && !activos.some((a) => a.es_desempate)) {
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
