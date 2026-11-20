/* campos — cómo se llama cada dato migrado y con qué lista cerrada se corrige. El correo del par se escribe. */
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

/** Opciones de la lista cerrada; null cuando el valor se escribe (el correo). */
export const OPCIONES_CAMPO: Record<
  CampoPorCorregir,
  Array<{ valor: string; etiqueta: string }> | null
> = {
  'tipo-articulo': TIPOS_ARTICULO,
  'estado-articulo': ESTADOS.map((e) => ({ valor: e, etiqueta: DEFINICIONES_ESTADO[e].texto })),
  concepto: OPCIONES_CONCEPTO,
  'correo-par': null,
}
