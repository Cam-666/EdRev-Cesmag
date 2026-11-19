import { useQuery } from '@tanstack/react-query'
import { obtenerResumen, obtenerTablero } from '../services/panelService'
import { useRevista } from '@/lib/revista/useRevista'

/** Dashboard of the active journal; the journal is part of the cache key. */
export function useTablero() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['tablero', revista],
    queryFn: () => obtenerTablero(revista),
  })
}

/** Summary of both journals (the home screen is the cross-journal view). */
export function useResumen() {
  return useQuery({ queryKey: ['resumen'], queryFn: obtenerResumen })
}
