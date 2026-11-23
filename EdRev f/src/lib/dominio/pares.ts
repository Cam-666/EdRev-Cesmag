/*
 * pares — reglas sobre los lugares de los pares de un artículo, que comparten las pantallas y la API simulada.
 * - Solo los pares que aceptaron o entregaron ocupan uno de los tres lugares; los que declinan o no responden no.
 * - Un par está disponible cuando no está bloqueado y no tiene una evaluación en curso (invitado o aceptó).
 * - Un artículo lo evalúan dos pares: cuando ya tiene dos (invitados, que aceptaron o que entregaron) no se
 *   buscan más, y un tercero se permite solo cuando los conceptos de los dos no coinciden.
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

/** Un par que ocupa un lugar del artículo: invitado, aceptó o entregó. */
export function activa(a: { estado: EstadoAsignacion }): boolean {
  return a.estado !== 'no-acepto' && a.estado !== 'sin-respuesta'
}

const CONCEPTOS_REALES: readonly ConceptoPar[] = [
  'publicable',
  'publicable-con-modificaciones',
  'no-publicable',
]

/** Dos conceptos entregados, reales y distintos. */
export function conceptosDifieren(
  a: AsignacionRegla | undefined,
  b: AsignacionRegla | undefined,
): boolean {
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
  /** Lugares ocupados (invitado, aceptó o entregó). */
  lugares: number
  /** Si se puede asignar otro par. */
  puede: boolean
  /** El siguiente par sería el de desempate (los dos conceptos no coinciden). */
  desempate: boolean
  /** Por qué no se asignan más pares, cuando `puede` es falso. */
  motivo: string | null
}

/** `asignaciones` en orden de asignación (un par que declinó o no respondió no ocupa lugar). */
export function reglaPares(asignaciones: AsignacionRegla[]): ReglaPares {
  const activos = asignaciones.filter(activa)
  const lugares = activos.length
  if (lugares < PARES_BASE) return { lugares, puede: true, desempate: false, motivo: null }
  if (lugares >= MAX_PARES_ACTIVOS) {
    return {
      lugares,
      puede: false,
      desempate: false,
      motivo: 'El artículo ya tiene tres pares evaluadores',
    }
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
