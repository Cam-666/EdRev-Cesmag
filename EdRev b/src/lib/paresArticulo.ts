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
