/** Roles of the system (RNF-05). Peers and authors never log in. */
export type Perfil = 'administrador' | 'auxiliar'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  perfil: Perfil
  estado: 'activo' | 'inhabilitado'
  /** ISO 8601 date-time of the last access. */
  ultimoIngreso: string | null
}

export const ETIQUETA_PERFIL: Record<Perfil, string> = {
  administrador: 'Administradora',
  auxiliar: 'Auxiliar',
}
