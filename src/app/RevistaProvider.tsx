/*
 * RevistaProvider — exposes the active journal, derived only from the :revista URL segment.
 * Covers: RF-02 (separation by journal).
 */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { RevistaContext } from './RevistaContext'
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
