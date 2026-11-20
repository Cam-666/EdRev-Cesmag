/*
 * paresArticulo — cuántos pares toma un artículo y cuándo se permite un tercero. Un artículo lo evalúan dos
 * pares: cuando ya tiene dos (invitados, que aceptaron o que entregaron) no se buscan más, y un tercero solo
 * se permite si los conceptos de los dos no coinciden (par de desempate). El límite absoluto es tres.
 */
export const PARES_BASE = 2
export const PARES_MAXIMO = 3

export interface FilaPar {
  estado_par: string
  concepto: string | null
  es_desempate?: boolean
}

const CONCEPTOS_REALES = ['publicable', 'con-modificaciones', 'no-publicable']

/** Dos conceptos entregados que son reales y distintos. */
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
 * Lo que deciden los conceptos de los pares para el artículo: cuando todos los pares que ocupan un lugar
 * entregaron un concepto real y la mayoría coincide, ese concepto es el resultado. Con dos pares deben
 * coincidir los dos; un tercero (desempate) resuelve el desacuerdo por mayoría.
 * Devuelve `null` mientras alguien no ha entregado, mientras los dos pares no coinciden (se espera al tercero)
 * o cuando ningún concepto tiene mayoría (decide el comité).
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

/** `activos`: las evaluaciones en curso o entregadas (invitado, aceptó, entregó), en orden. */
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
