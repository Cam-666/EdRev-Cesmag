/*
 * conflicto — conflict-of-interest rule when assigning a peer. Pure, shared by the mock API and
 * the interface. Covers: RF-17, HU-12. A peer of the same institution as an author is refused.
 */
import type { Autor } from '@/types/autor'
import type { ParEvaluador } from '@/types/par'

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
