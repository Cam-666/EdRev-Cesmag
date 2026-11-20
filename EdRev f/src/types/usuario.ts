/** Perfiles del sistema. Los pares y los autores nunca ingresan. */
export type Perfil = 'administrador' | 'auxiliar'

export interface Usuario {
  id: string
  nombre: string
  correo: string
  perfil: Perfil
  estado: 'activo' | 'inhabilitado'
  /** Fecha y hora ISO 8601 del último ingreso. */
  ultimoIngreso: string | null
}

export const ETIQUETA_PERFIL: Record<Perfil, string> = {
  administrador: 'Administradora',
  auxiliar: 'Auxiliar',
}

/** Datos para crear o editar una cuenta. */
export interface DatosUsuario {
  nombre: string
  correo: string
  perfil: Perfil
}
