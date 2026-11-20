import { createContext } from 'react'
import type { DatosRevista, Revista } from '@/types/revista'

export interface RevistaContextValue {
  revista: Revista
  datos: DatosRevista
}

/** null fuera de los módulos de revista (/inicio, /informes, /administracion y las pantallas de acceso). */
export const RevistaContext = createContext<RevistaContextValue | null>(null)
