import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { buscarAutores, opcionesDeFiltros } from '../services/autoresService'
import type { FiltrosAutores } from '../services/autoresService'
import { useRetardo } from '@/lib/useRetardo'
import { useRevistaDatos } from '@/lib/revista/useRevista'

/** The countries and institutions of the directory, for the filters of the list. */
export function useOpcionesFiltrosAutores() {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['autores', 'filtros'],
    queryFn: () => opcionesDeFiltros(revista),
  })
}

/** Searches the common author directory by name or ORCID (debounced) and by the filters given. */
export function useBuscarAutores(
  texto: string,
  limite = 50,
  activo = true,
  filtros: FiltrosAutores = {},
) {
  const revista = useRevistaDatos()
  const q = useRetardo(texto.trim(), 250)
  return useQuery({
    queryKey: ['autores', 'directorio', q, limite, filtros],
    queryFn: () => buscarAutores(revista, q, limite, filtros),
    placeholderData: keepPreviousData,
    enabled: activo,
  })
}
