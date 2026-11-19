/*
 * campos — what each migrated datum is called and which closed list it is corrected with
 * (section 3.1 of the requirements). The peer email is typed. Covers: RF-44.
 */
import { TIPOS_ARTICULO } from '@/modules/articulos/config/listas'
import { OPCIONES_CONCEPTO } from '@/modules/pares/config/listas'
import { DEFINICIONES_ESTADO } from '@/components/common/DistintivoEstado'
import type { EstadoArticulo } from '@/types/articulo'
import type { CampoPorCorregir } from '@/types/migracion'

const ESTADOS: EstadoArticulo[] = [
  'postulado',
  'en-revision',
  'en-evaluacion',
  'aprobado',
  'rechazado',
  'archivado',
]

export const ETIQUETA_CAMPO: Record<CampoPorCorregir, string> = {
  'tipo-articulo': 'Tipo de artículo',
  'estado-articulo': 'Estado del artículo',
  concepto: 'Concepto del par',
  'correo-par': 'Correo del par',
}

/** Options of the closed list; null when the value is typed (the email). */
export const OPCIONES_CAMPO: Record<
  CampoPorCorregir,
  Array<{ valor: string; etiqueta: string }> | null
> = {
  'tipo-articulo': TIPOS_ARTICULO,
  'estado-articulo': ESTADOS.map((e) => ({ valor: e, etiqueta: DEFINICIONES_ESTADO[e].texto })),
  concepto: OPCIONES_CONCEPTO,
  'correo-par': null,
}
