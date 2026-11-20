import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { articulosDeAutor, obtenerAutor, registrarAutor } from '../services/autoresService'
import { useRevistaDatos } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'

/** Un autor del directorio común. */
export function useAutor(id: string) {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['autores', 'ficha', id],
    queryFn: () => obtenerAutor(revista, id),
  })
}

/** Artículos de un autor en las dos revistas. */
export function useArticulosDeAutor(id: string) {
  const revista = useRevistaDatos()
  return useQuery({
    queryKey: ['autores', 'articulos', id],
    queryFn: () => articulosDeAutor(revista, id),
  })
}

export function useRegistrarAutor() {
  const revista = useRevistaDatos()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosAutor) => registrarAutor(revista, datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['autores'] }),
  })
}
