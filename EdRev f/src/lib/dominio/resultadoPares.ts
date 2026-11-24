/*
 * resultadoPares — lo que deciden los conceptos de los pares para un artículo, compartido por las pantallas y la
 * API simulada para que lo que muestra la página y lo que hace el servidor nunca se contradigan.
 * Cuando todos los pares que ocupan un lugar entregaron un concepto real y la mayoría coincide, ese concepto es
 * el resultado (con dos pares deben coincidir los dos; un tercero resuelve el desacuerdo):
 * - «No publicable»: la dependencia decide si abre una nueva ronda del comité o rechaza el artículo definitivamente.
 * - «Publicable con modificaciones»: el artículo vuelve al comité para una nueva ronda.
 * - «Publicable»: el artículo se aprueba; necesita el volumen y el número de la publicación.
 */
import { PARES_BASE } from './pares'
import type { ConceptoPar, EstadoAsignacion, ResultadoPares } from '@/types/par'

const REALES: readonly ResultadoPares[] = [
  'publicable',
  'publicable-con-modificaciones',
  'no-publicable',
]

export function resultadoDePares(
  asignaciones: Array<{ estado: EstadoAsignacion; concepto: ConceptoPar | null }>,
): ResultadoPares | null {
  const vigentes = asignaciones.filter(
    (a) =>
      a.estado === 'invitado' ||
      a.estado === 'segundo-intento' ||
      a.estado === 'acepto' ||
      a.estado === 'entrego',
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
