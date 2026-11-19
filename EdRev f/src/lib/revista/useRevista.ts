import { useContext } from 'react'
import { RevistaContext } from './RevistaContext'
import type { RevistaContextValue } from './RevistaContext'
import type { Revista } from '@/types/revista'

/** Active journal; only valid inside the journal modules. */
export function useRevista(): RevistaContextValue {
  const valor = useContext(RevistaContext)
  if (!valor) throw new Error('useRevista must be used inside a journal route (/:revista/...)')
  return valor
}

/**
 * Journal that anchors the API route of the data both journals share (authors and peers). Inside a
 * journal it is that journal; on the common screens (/autores, /pares) it is REEP, because the
 * directory is the same whichever route is used.
 */
export function useRevistaDatos(): Revista {
  return useContext(RevistaContext)?.revista ?? 'reep'
}

/** Active journal or null on cross-journal modules. */
export function useRevistaOpcional(): RevistaContextValue | null {
  return useContext(RevistaContext)
}
