/*
 * perfiles — the profiles a user account can have and the labels of the audit types.
 * Covers: RF-40, RF-41.
 */
import type { TipoAuditoria } from '@/types/historial'
import type { Perfil } from '@/types/usuario'

export const PERFILES: Array<{ valor: Perfil; etiqueta: string }> = [
  { valor: 'administrador', etiqueta: 'Administradora' },
  { valor: 'auxiliar', etiqueta: 'Auxiliar' },
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
  traslado: 'Cambio de revista',
  cierre: 'Cierre del proceso',
  observacion: 'Observación',
}
