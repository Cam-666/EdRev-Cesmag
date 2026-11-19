import { useQueryClient } from '@tanstack/react-query'

/**
 * Refreshes the cached peer and article queries of both journals. Assigning, answering or
 * blocking changes both: the peer record and the article sheet.
 */
export function useInvalidarPares() {
  const cliente = useQueryClient()
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['pares'] }),
      cliente.invalidateQueries({ queryKey: ['articulos'] }),
    ])
}
