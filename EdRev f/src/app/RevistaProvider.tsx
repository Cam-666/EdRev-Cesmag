/*
 * RevistaProvider — expone la revista activa, que se deduce solo del segmento :revista de la URL.
 * Así cada pantalla de revista muestra únicamente los datos de la suya.
 */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { RevistaContext } from '@/lib/revista/RevistaContext'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

export interface RevistaProviderProps {
  revista: Revista
  children: ReactNode
}

export function RevistaProvider({ revista, children }: RevistaProviderProps) {
  const valor = useMemo(() => ({ revista, datos: REVISTAS[revista] }), [revista])
  return <RevistaContext.Provider value={valor}>{children}</RevistaContext.Provider>
}
