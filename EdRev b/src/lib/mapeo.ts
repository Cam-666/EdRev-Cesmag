/*
 * mapeo — convierte las filas de la base de datos en las formas que ya usa la interfaz, y traduce los pocos
 * códigos que difieren entre la base y la página.
 */
export interface FilaUsuario {
  id_usuario: number
  nombre: string
  correo: string
  rol: 'administrador' | 'auxiliar'
  activo: boolean
  ultimo_ingreso: Date | null
}

export function usuarioApi(f: FilaUsuario) {
  return {
    id: String(f.id_usuario),
    nombre: f.nombre,
    correo: f.correo,
    perfil: f.rol,
    estado: f.activo ? 'activo' : 'inhabilitado',
    ultimoIngreso: f.ultimo_ingreso ? f.ultimo_ingreso.toISOString() : null,
  }
}

/** Concepto del par: la página dice «publicable-con-modificaciones», la base «con-modificaciones». */
export const conceptoApi = (c: string | null) =>
  c === 'con-modificaciones' ? 'publicable-con-modificaciones' : c
export const conceptoDb = (c: string) =>
  c === 'publicable-con-modificaciones' ? 'con-modificaciones' : c

/** Motivo de bloqueo: la página dice «no-desea», la base «no-participa». */
export const motivoApi = (m: string | null) => (m === 'no-participa' ? 'no-desea' : m)
export const motivoDb = (m: string) => (m === 'no-desea' ? 'no-participa' : m)

export function iso(fecha: Date | string | null): string | null {
  if (fecha === null) return null
  return typeof fecha === 'string' ? fecha : fecha.toISOString()
}

export function publicacionApi(volumen: number | null, numero: number | null) {
  return volumen !== null && numero !== null ? { volumen, numero } : null
}

/** Palabras que no distinguen una institución de otra: «Universidad Cesmag» y «Cesmag» son la misma. */
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
 * Si dos nombres son la misma institución: coinciden sin importar mayúsculas, tildes ni las palabras genéricas
 * (Universidad, de, la…), o todas las palabras propias de uno están en el otro («Cesmag» en «Universidad CESMAG»).
 * Se usa para el conflicto de interés al asignar pares.
 */
export function mismaUniversidad(a: string | null, b: string | null): boolean {
  const x = palabras(a)
  const y = palabras(b)
  if (x.size === 0 || y.size === 0) return false
  const [corto, largo] = x.size <= y.size ? [x, y] : [y, x]
  return [...corto].every((p) => largo.has(p))
}

/** Autores cuya institución es la del par (la asignación se rechaza porque habría conflicto de interés). */
export function mismaInstitucion(
  universidad: string | null,
  autores: Array<{ nombre: string; filiacion: string | null }>,
): string | null {
  const delMismo = autores.filter((a) => universidad && mismaUniversidad(a.filiacion, universidad))
  if (delMismo.length === 0) return null
  const quien = delMismo.length === 1 ? 'del autor' : 'de los autores'
  return `El par pertenece a ${universidad}, la misma institución ${quien} ${delMismo.map((a) => a.nombre).join(', ')}: no se puede asignar a este artículo.`
}
