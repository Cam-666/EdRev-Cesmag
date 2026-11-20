import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  listarAreas,
  listarPares,
  listarUniversidades,
  obtenerPar,
} from '../services/paresService'
import type { FiltrosPares } from '../services/paresService'
import { useRevistaDatos } from '@/lib/revista/useRevista'

/** Pares de la revista activa. La revista forma parte de la clave de la caché. */
export function usePares(filtros: FiltrosPares) {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['pares', revista, 'lista', filtros],
    queryFn: () => listarPares(revista, filtros),
    placeholderData: keepPreviousData,
  })
}

/** Áreas temáticas ya registradas, que se ofrecen como sugerencias. */
export function useAreas() {
  const revista = useRevistaDatos()
  return useQuery({ queryKey: ['pares', revista, 'areas'], queryFn: () => listarAreas(revista) })
}

export function useUniversidades() {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['pares', revista, 'universidades'],
    queryFn: () => listarUniversidades(revista),
  })
}

export function usePar(id: string) {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['pares', revista, 'detalle', id],
    queryFn: () => obtenerPar(revista, id),
    enabled: id !== '',
  })
}
