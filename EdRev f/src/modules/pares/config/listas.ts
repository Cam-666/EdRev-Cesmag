/* listas — nombres del módulo de pares: motivos de bloqueo y conceptos. */
import type { MotivoBloqueo } from '@/types/par'

export const ETIQUETA_MOTIVO: Record<MotivoBloqueo, string> = {
  'sin-respuesta': 'Sin respuesta · 2.º intento',
  'no-desea': 'No desea participar',
}

export const MOTIVOS_BLOQUEO: Array<{ valor: MotivoBloqueo; etiqueta: string }> = [
  { valor: 'no-desea', etiqueta: ETIQUETA_MOTIVO['no-desea'] },
  { valor: 'sin-respuesta', etiqueta: ETIQUETA_MOTIVO['sin-respuesta'] },
]

export const OPCIONES_CONCEPTO: Array<{ valor: string; etiqueta: string }> = [
  { valor: 'publicable', etiqueta: 'Publicable' },
  {
    valor: 'publicable-con-modificaciones',
    etiqueta: 'Publicable con modificaciones sustanciales',
  },
  { valor: 'no-publicable', etiqueta: 'No publicable' },
  { valor: 'pendiente-formato', etiqueta: 'Pendiente formato de evaluación' },
]
