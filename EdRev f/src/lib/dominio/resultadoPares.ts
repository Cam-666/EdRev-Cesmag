/*
 * resultadoPares — lo que deciden los conceptos de los pares para un artículo, compartido por las pantallas y la
 * API simulada para que lo que muestra la página y lo que hace el servidor nunca se contradigan.
 * Cuando todos los pares que ocupan un lugar entregaron un concepto real y la mayoría coincide, ese concepto es
 * el resultado (con dos pares deben coincidir los dos; un tercero resuelve el desacuerdo):
 * - «No publicable»: el proceso se cierra y el artículo queda «Rechazado».
 * - «Publicable con modificaciones»: el artículo vuelve al comité para una nueva ronda.
 * - «Publicable»: el artículo se aprueba; necesita el volumen y el número de la publicación.
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

/** Mensaje de la ficha para cada resultado. */
export const TEXTO_RESULTADO: Record<ResultadoPares, string> = {
  'no-publicable':
    'Los pares evaluadores calificaron el artículo como no publicable. El proceso se cerró y el artículo quedó rechazado.',
  'publicable-con-modificaciones':
    'Los pares evaluadores calificaron el artículo como publicable con modificaciones sustanciales. Con su constancia termina la participación de los pares; el artículo pasa a una nueva ronda del comité editorial, que verificará si los autores corrigieron el artículo y decidirá si se aprueba su publicación.',
  publicable:
    'Los pares evaluadores calificaron el artículo como publicable. Asigne el volumen y el número para cerrar el proceso como aprobado.',
}
