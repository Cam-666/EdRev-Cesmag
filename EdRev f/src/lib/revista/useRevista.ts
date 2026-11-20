import { useContext } from 'react'
import { RevistaContext } from './RevistaContext'
import type { RevistaContextValue } from './RevistaContext'
import type { Revista } from '@/types/revista'

/** Revista activa; solo es válida dentro de los módulos de revista. */
export function useRevista(): RevistaContextValue {
  const valor = useContext(RevistaContext)
  if (!valor) throw new Error('useRevista must be used inside a journal route (/:revista/...)')
  return valor
}

/**
 * Revista que sirve de ancla a la ruta de la API de los datos que comparten las dos revistas (autores y pares).
 * Dentro de una revista es esa revista; en las pantallas comunes (/autores, /pares) es REEP, porque el directorio
 * es el mismo sin importar la ruta que se use.
 */
export function useRevistaDatos(): Revista {
  return useContext(RevistaContext)?.revista ?? 'reep'
}

/** Revista activa o null en los módulos de las dos revistas. */
export function useRevistaOpcional(): RevistaContextValue | null {
  return useContext(RevistaContext)
}
