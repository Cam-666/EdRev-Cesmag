/*
 * mapeo — rows of the database turned into the shapes the frontend already uses (the contract of
 * its simulated API), and the few codes that differ between the data model and the page.
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

/** Concept of a peer: the page says «publicable-con-modificaciones», the model «con-modificaciones». */
export const conceptoApi = (c: string | null) =>
  c === 'con-modificaciones' ? 'publicable-con-modificaciones' : c
export const conceptoDb = (c: string) =>
  c === 'publicable-con-modificaciones' ? 'con-modificaciones' : c

/** Block reason: the page says «no-desea», the model «no-participa». */
export const motivoApi = (m: string | null) => (m === 'no-participa' ? 'no-desea' : m)
export const motivoDb = (m: string) => (m === 'no-desea' ? 'no-participa' : m)

export function iso(fecha: Date | string | null): string | null {
  if (fecha === null) return null
  return typeof fecha === 'string' ? fecha : fecha.toISOString()
}

export function publicacionApi(volumen: number | null, numero: number | null) {
  return volumen !== null && numero !== null ? { volumen, numero } : null
}

const limpio = (t: string | null) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** Authors whose institution is the peer's own (the assignment is refused, RF-17). */
export function mismaInstitucion(
  universidad: string | null,
  autores: Array<{ nombre: string; filiacion: string | null }>,
): string | null {
  const delMismo = autores.filter((a) => universidad && limpio(a.filiacion) === limpio(universidad))
  if (delMismo.length === 0) return null
  const quien = delMismo.length === 1 ? 'del autor' : 'de los autores'
  return `El par pertenece a ${universidad}, la misma institución ${quien} ${delMismo.map((a) => a.nombre).join(', ')}: no se puede asignar a este artículo.`
}
