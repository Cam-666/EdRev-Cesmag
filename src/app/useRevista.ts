import { useContext } from 'react'
import { RevistaContext } from './RevistaContext'
import type { RevistaContextValue } from './RevistaContext'

/** Active journal; only valid inside the journal modules. */
export function useRevista(): RevistaContextValue {
  const valor = useContext(RevistaContext)
  if (!valor) throw new Error('useRevista must be used inside a journal route (/:revista/...)')
  return valor
}

/** Active journal or null on cross-journal modules. */
export function useRevistaOpcional(): RevistaContextValue | null {
  return useContext(RevistaContext)
}
