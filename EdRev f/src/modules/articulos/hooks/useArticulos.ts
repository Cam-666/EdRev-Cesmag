import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listarArticulos, listarAnios, listarPublicaciones } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'
import type { FiltrosArticulos } from '@/types/articulo'

/** Listado de artículos de la revista activa. La revista forma parte de la clave de la caché. */
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
