/*
 * firmaCorreo — who signs the mails of a journal: the name and the position the Administradora sets in
 * Configuración (RF-25, RF-45). While no name is set, the signer is the active Administradora of the
 * dependency, so the signature is never missing.
 */
import type { Cliente } from '../db.js'

export interface Firmante {
  nombre: string
  /** Position under the name; may be empty. */
  cargo: string
}

interface DatosDeFirma {
  firma_nombre: string | null
  firma_cargo: string | null
  /** Name of the active Administradora, the signer by default. */
  administradora: string | null
}

export function firmanteDe(d: DatosDeFirma): Firmante {
  return { nombre: d.firma_nombre?.trim() || d.administradora?.trim() || '', cargo: d.firma_cargo?.trim() ?? '' }
}

/** SQL fragment: the name of the active Administradora (the default signer). */
export const SQL_ADMINISTRADORA =
  "(SELECT u.nombre FROM usuario u WHERE u.rol = 'administrador' AND u.activo ORDER BY u.id_usuario LIMIT 1)"

export async function firmanteDeRevista(c: Cliente, idRevista: number): Promise<Firmante> {
  const { rows } = await c.query<DatosDeFirma>(
    `SELECT r.firma_nombre, r.firma_cargo, ${SQL_ADMINISTRADORA} AS administradora FROM revista r WHERE r.id_revista = $1`,
    [idRevista],
  )
  return firmanteDe(rows[0] ?? { firma_nombre: null, firma_cargo: null, administradora: null })
}
