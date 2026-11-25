/*
 * permisos — única fuente de verdad de lo que puede hacer cada perfil (autorización).
 * La Auxiliar hace todo el trabajo editorial de las dos revistas y también entra a Administración (plantillas,
 * auditoría y configuración); solo las cuentas de usuario son de la Administradora.
 */
import type { Perfil } from '@/types/usuario'

export type Accion =
  /** Registrar artículos, autores, pares y observaciones. */
  | 'registrar-datos'
  /** Asignar pares y reenviar invitaciones. */
  | 'asignar-pares'
  /** Antiplagio y revisión del comité. */
  | 'registrar-revision'
  /** Concepto del par. */
  | 'registrar-concepto'
  /** Marcar una evaluación como entregada. */
  | 'marcar-entrega'
  /** Emitir o volver a emitir constancias. */
  | 'emitir-constancia'
  /** Bloquear un par a mano. */
  | 'bloquear-par'
  /** Desbloquear un par. */
  | 'desbloquear-par'
  /** Registrar la respuesta de un par a la invitación. */
  | 'registrar-respuesta'
  /** Reabrir un artículo archivado. */
  | 'reabrir-articulo'
  /** Cerrar el proceso de un artículo como aprobado, rechazado o archivado. */
  | 'cerrar-articulo'
  /** Plantillas, auditoría y configuración (el módulo de Administración). */
  | 'administrar'
  /** Cuentas de usuario: crear, editar, inhabilitar y eliminar. */
  | 'administrar-usuarios'

const TODAS: readonly Accion[] = [
  'registrar-datos',
  'asignar-pares',
  'registrar-revision',
  'registrar-concepto',
  'marcar-entrega',
  'emitir-constancia',
  'bloquear-par',
  'desbloquear-par',
  'registrar-respuesta',
  'reabrir-articulo',
  'cerrar-articulo',
  'administrar',
  'administrar-usuarios',
]

const PERMISOS: Record<Perfil, ReadonlySet<Accion>> = {
  administrador: new Set(TODAS),
  auxiliar: new Set(TODAS.filter((a) => a !== 'administrar-usuarios')),
}

export function puede(perfil: Perfil, accion: Accion): boolean {
  return PERMISOS[perfil].has(accion)
}
