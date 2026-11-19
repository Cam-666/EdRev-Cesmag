/*
 * conflicto — conflict-of-interest rule when assigning a peer. Pure, shared by the mock API and
 * the interface. Covers: RF-17, HU-12. A peer of the same institution as an author is refused.
 */
import type { Autor } from '@/types/autor'
import type { ParEvaluador } from '@/types/par'

/** Words that do not tell one institution from another: «Universidad Cesmag» and «Cesmag» are the same. */
const GENERICAS = new Set([
  'universidad', 'universitaria', 'universitario', 'univ', 'institucion', 'instituto', 'corporacion',
  'fundacion', 'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'u', 'en', 'sede',
])

function palabras(texto: string | null): Set<string> {
  const limpio = (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
  return new Set(limpio.split(' ').filter((p) => p && !GENERICAS.has(p)))
}

/**
 * Whether two names are the same institution: they coincide ignoring case, accents and the generic
 * words (Universidad, de, la…), or all the distinctive words of one are in the other
 * («Cesmag» in «Universidad CESMAG»).
 */
export function mismaUniversidad(a: string | null, b: string | null): boolean {
  const x = palabras(a)
  const y = palabras(b)
  if (x.size === 0 || y.size === 0) return false
  const [corto, largo] = x.size <= y.size ? [x, y] : [y, x]
  return [...corto].every((p) => largo.has(p))
}

/**
 * Authors whose institution is the peer's own: the assignment is refused (RF-17, HU-12). Returns
 * the sentence to show, or null when there is none.
 */
export function mismaInstitucion(
  par: Pick<ParEvaluador, 'universidad'>,
  autores: Array<Pick<Autor, 'nombre' | 'filiacion'>>,
): string | null {
  const delMismo = autores.filter((a) => par.universidad && mismaUniversidad(a.filiacion, par.universidad))
  if (delMismo.length === 0) return null
  const quien = delMismo.length === 1 ? 'del autor' : 'de los autores'
  return `El par pertenece a ${par.universidad}, la misma institución ${quien} ${delMismo.map((a) => a.nombre).join(', ')}: no se puede asignar a este artículo.`
}
