/*
 * conflicto — conflict-of-interest rule when assigning a peer. Pure, shared by the mock API and
 * the interface. Covers: RF-17, HU-12. A conflict only warns; it never blocks the assignment.
 */
import type { Autor } from '@/types/autor'
import type { Conflicto, ParEvaluador } from '@/types/par'

export const UNIVERSIDAD_CESMAG = 'Universidad CESMAG'

function igual(a: string, b: string): boolean {
  const limpio = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  return limpio(a) === limpio(b)
}

/**
 * A peer conflicts when it belongs to Universidad CESMAG or to the same university as any author
 * of the article. Without authors only the CESMAG rule can apply.
 */
export function detectarConflicto(
  par: Pick<ParEvaluador, 'universidad'>,
  autores: Array<Pick<Autor, 'nombre' | 'filiacion'>>,
): Conflicto | null {
  const delMismo = autores.filter((a) => igual(a.filiacion, par.universidad))
  const esCesmag = igual(par.universidad, UNIVERSIDAD_CESMAG)

  if (delMismo.length > 0) {
    const nombres = delMismo.map((a) => a.nombre).join(', ')
    const verbo = delMismo.length === 1 ? 'el autor' : 'los autores'
    return {
      mensaje: `El par y ${verbo} ${nombres} pertenecen a ${par.universidad}. Puede asignarlo de todos modos.`,
    }
  }
  if (esCesmag) {
    return {
      mensaje: `El par pertenece a ${UNIVERSIDAD_CESMAG}. Puede asignarlo de todos modos.`,
    }
  }
  return null
}
