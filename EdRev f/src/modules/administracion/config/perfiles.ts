/*
 * perfiles — the "Qué puede hacer cada perfil" matrix and the labels of the audit types. The matrix
 * is computed from the single permissions table (modules/acceso/config/permisos), so what the
 * screen says and what the system enforces can never drift apart.
 * Covers: RF-40, RNF-05, HU-29 (criterion 3), RF-41.
 */
import type { Accion } from '@/modules/acceso/config/permisos'
import type { TipoAuditoria } from '@/types/historial'
import type { Perfil } from '@/types/usuario'

export const PERFILES: Array<{ valor: Perfil; etiqueta: string }> = [
  { valor: 'administrador', etiqueta: 'Administradora' },
  { valor: 'auxiliar', etiqueta: 'Auxiliar' },
]

/** Rows of the matrix: the label and the permission that decides it. */
export const FILAS_MATRIZ: Array<{ etiqueta: string; accion: Accion }> = [
  { etiqueta: 'Registrar artículos, autores y pares', accion: 'registrar-datos' },
  { etiqueta: 'Asignar pares y reenviar invitaciones', accion: 'asignar-pares' },
  { etiqueta: 'Registrar conceptos y marcar entregas', accion: 'registrar-concepto' },
  { etiqueta: 'Emitir constancias', accion: 'emitir-constancia' },
  { etiqueta: 'Administrar cuentas y plantillas', accion: 'administrar' },
]

export const ETIQUETA_TIPO_AUDITORIA: Record<TipoAuditoria, string> = {
  registro: 'Registro',
  edicion: 'Edición',
  revision: 'Revisión',
  asignacion: 'Asignación',
  entrega: 'Entrega',
  constancia: 'Constancia',
  bloqueo: 'Bloqueo',
  fallo: 'Fallo',
  reapertura: 'Reapertura',
  observacion: 'Observación',
}
