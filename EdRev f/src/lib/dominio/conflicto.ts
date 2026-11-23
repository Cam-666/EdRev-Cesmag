/*
 * conflicto — regla de conflicto de interés al asignar un par. Es pura y la comparten la API simulada y la
 * interfaz: se rechaza un par de la misma institución que alguno de los autores.
 */
import type { Autor } from '@/types/autor'
import type { ParEvaluador } from '@/types/par'

/** Palabras que no distinguen una institución de otra: «Universidad Cesmag» y «Cesmag» son la misma. */
const GENERICAS = new Set([
  'universidad',
  'universitaria',
  'universitario',
  'univ',
  'institucion',
  'instituto',
  'corporacion',
  'fundacion',
  'de',
  'del',
  'la',
  'las',
  'los',
  'el',
  'y',
  'e',
  'u',
  'en',
  'sede',
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
 * Si dos nombres son la misma institución: coinciden sin importar mayúsculas, tildes ni las palabras genéricas
 * (Universidad, de, la…), o todas las palabras propias de uno están en el otro («Cesmag» en «Universidad CESMAG»).
 */
export function mismaUniversidad(a: string | null, b: string | null): boolean {
  const x = palabras(a)
  const y = palabras(b)
  if (x.size === 0 || y.size === 0) return false
  const [corto, largo] = x.size <= y.size ? [x, y] : [y, x]
  return [...corto].every((p) => largo.has(p))
}

/**
 * Autores cuya institución es la del par: la asignación se rechaza. Devuelve la frase que se muestra, o null si
 * no hay conflicto.
 */
export function mismaInstitucion(
  par: Pick<ParEvaluador, 'universidad'>,
  autores: Array<Pick<Autor, 'nombre' | 'filiacion'>>,
): string | null {
  const delMismo = autores.filter(
    (a) => par.universidad && mismaUniversidad(a.filiacion, par.universidad),
  )
  if (delMismo.length === 0) return null
  const quien = delMismo.length === 1 ? 'del autor' : 'de los autores'
  return `El par pertenece a ${par.universidad}, la misma institución ${quien} ${delMismo.map((a) => a.nombre).join(', ')}: no se puede asignar a este artículo.`
}
