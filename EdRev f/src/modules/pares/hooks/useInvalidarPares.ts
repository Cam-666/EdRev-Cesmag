import { useQueryClient } from '@tanstack/react-query'
import { useRevista } from '@/lib/revista/useRevista'

/**
 * Refreshes the cached peer and article queries of the active journal. Assigning, answering or
 * blocking changes both: the peer record and the article sheet.
 */
export function useInvalidarPares() {
  const cliente = useQueryClient()
  const { revista } = useRevista()
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['pares', revista] }),
      cliente.invalidateQueries({ queryKey: ['articulos', revista] }),
    ])
}
