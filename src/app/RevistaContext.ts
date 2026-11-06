import { createContext } from 'react'
import type { DatosRevista, Revista } from '@/types/revista'

export interface RevistaContextValue {
  revista: Revista
  datos: DatosRevista
}

/** null outside the journal modules (/inicio, /informes, /administracion, access screens). */
export const RevistaContext = createContext<RevistaContextValue | null>(null)
