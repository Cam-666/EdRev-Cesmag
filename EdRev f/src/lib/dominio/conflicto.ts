/*
 * conflicto — conflict-of-interest rule when assigning a peer. Pure, shared by the mock API and
 * the interface. Covers: RF-17, HU-12. A peer of the same institution as an author is refused;
 * a peer from CESMAG only warns.
 */
import type { Autor } from '@/types/autor'
import type { Conflicto, ParEvaluador } from '@/types/par'

export const UNIVERSIDAD_CESMAG = 'Universidad CESMAG'

function igual(a: string, b: string): boolean {
  const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  return limpio(a) === limpio(b)
}

/**
 * Authors whose institution is the peer's own: the assignment is refused (RF-17, HU-12). Returns
 * the sentence to show, or null when there is none.
 */
export function mismaInstitucion(
  par: Pick<ParEvaluador, 'universidad'>,
  autores: Array<Pick<Autor, 'nombre' | 'filiacion'>>,
): string | null {
  const delMismo = autores.filter((a) => par.universidad && igual(a.filiacion, par.universidad))
  if (delMismo.length === 0) return null
  const quien = delMismo.length === 1 ? 'del autor' : 'de los autores'
  return `El par pertenece a ${par.universidad}, la misma institución ${quien} ${delMismo.map((a) => a.nombre).join(', ')}: no se puede asignar a este artículo.`
}

/** A peer from Universidad CESMAG is only warned: it can be assigned anyway. */
export function detectarConflicto(
  par: Pick<ParEvaluador, 'universidad'>,
  _autores?: Array<Pick<Autor, 'nombre' | 'filiacion'>>,
): Conflicto | null {
  if (igual(par.universidad, UNIVERSIDAD_CESMAG)) {
    return { mensaje: `El par pertenece a ${UNIVERSIDAD_CESMAG}. Puede asignarlo de todos modos.` }
  }
  return null
}
