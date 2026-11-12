import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buscarAutores } from '../services/autoresService'
import { useRetardo } from '@/lib/useRetardo'
import { useRevista } from '@/lib/revista/useRevista'
import type { Revista } from '@/types/revista'

/** Searches the common author directory by name or ORCID (debounced), optionally by journal. */
export function useBuscarAutores(texto: string, limite = 50, activo = true, en?: Revista) {
  const { revista } = useRevista()
  const q = useRetardo(texto.trim(), 250)
  return useQuery({
    queryKey: ['autores', 'directorio', q, limite, en ?? 'ambas'],
    queryFn: () => buscarAutores(revista, q, limite, en),
    placeholderData: keepPreviousData,
    enabled: activo,
  })
}
