import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buscarAutores } from '../services/autoresService'
import { useRetardo } from '@/lib/useRetardo'
import { useRevista } from '@/lib/revista/useRevista'

/** Searches the reusable author records of the active journal by name or ORCID (debounced). */
export function useBuscarAutores(texto: string, limite = 50, activo = true) {
  const { revista } = useRevista()
  const q = useRetardo(texto.trim(), 250)
  return useQuery({
    queryKey: ['autores', revista, q, limite],
    queryFn: () => buscarAutores(revista, q, limite),
    placeholderData: keepPreviousData,
    enabled: activo,
  })
}
