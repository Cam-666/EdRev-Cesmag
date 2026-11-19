import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listarArticulos, listarAnios, listarPublicaciones } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'
import type { FiltrosArticulos } from '@/types/articulo'

/** Article list of the active journal (RF-35). The journal is part of the cache key. */
export function useArticulos(filtros: FiltrosArticulos) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'lista', filtros],
    queryFn: () => listarArticulos(revista, filtros),
    placeholderData: keepPreviousData,
  })
}

export function usePublicaciones() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'publicaciones'],
    queryFn: () => listarPublicaciones(revista),
  })
}

export function useAnios() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'anios'],
    queryFn: () => listarAnios(revista),
  })
}
