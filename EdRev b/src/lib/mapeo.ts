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

const UNIVERSIDAD_CESMAG = 'Universidad CESMAG'
const limpio = (t: string | null) =>
  (t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()

/** RF-17: same institution as an author, or CESMAG itself. It warns, never blocks. */
export function conflicto(
  universidad: string | null,
  autores: Array<{ nombre: string; filiacion: string | null }>,
): { mensaje: string } | null {
  const delMismo = autores.filter((a) => limpio(a.filiacion) === limpio(universidad) && universidad)
  if (delMismo.length > 0) {
    const verbo = delMismo.length === 1 ? 'el autor' : 'los autores'
    return {
      mensaje: `El par y ${verbo} ${delMismo.map((a) => a.nombre).join(', ')} pertenecen a ${universidad}. Puede asignarlo de todos modos.`,
    }
  }
  if (limpio(universidad) === limpio(UNIVERSIDAD_CESMAG)) {
    return { mensaje: `El par pertenece a ${UNIVERSIDAD_CESMAG}. Puede asignarlo de todos modos.` }
  }
  return null
}
