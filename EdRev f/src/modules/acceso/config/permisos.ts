/*
 * permisos — single source of truth for what each profile can do (authorization).
 * Covers: RNF-05, HU-29 (criterion 3), HU-11, HU-16, HU-21, HU-23.
 * Rule of thumb from the requirements: the Auxiliar only registers and consults.
 */
import type { Perfil } from '@/types/usuario'

export type Accion =
  /** Register articles, authors, peers and observations. */
  | 'registrar-datos'
  /** Assign peers and resend invitations. */
  | 'asignar-pares'
  /** Antiplagio and committee review (RF-05, RF-06). */
  | 'registrar-revision'
  /** Peer concept (RF-20). */
  | 'registrar-concepto'
  /** Mark an evaluation as delivered (RF-23). */
  | 'marcar-entrega'
  /** Issue or reissue constancias (RF-30, RF-33). */
  | 'emitir-constancia'
  /** Unblock a peer (RF-16). */
  | 'desbloquear-par'
  /** Reopen an archived article (RF-08). */
  | 'reabrir-articulo'
  /** Accounts, templates, parameters (RF-40, RNF-19). */
  | 'administrar'

const TODAS: readonly Accion[] = [
  'registrar-datos',
  'asignar-pares',
  'registrar-revision',
  'registrar-concepto',
  'marcar-entrega',
  'emitir-constancia',
  'desbloquear-par',
  'reabrir-articulo',
  'administrar',
]

const PERMISOS: Record<Perfil, ReadonlySet<Accion>> = {
  administrador: new Set(TODAS),
  auxiliar: new Set<Accion>(['registrar-datos', 'asignar-pares']),
}

export function puede(perfil: Perfil, accion: Accion): boolean {
  return PERMISOS[perfil].has(accion)
}
