import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { articulosDeAutor, obtenerAutor, registrarAutor } from '../services/autoresService'
import { useRevista } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'

/** One author of the common directory (RF-11). */
export function useAutor(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['autores', 'ficha', id],
    queryFn: () => obtenerAutor(revista, id),
  })
}

/** Articles of one author in both journals (RF-11). */
export function useArticulosDeAutor(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['autores', 'articulos', id],
    queryFn: () => articulosDeAutor(revista, id),
  })
}

export function useRegistrarAutor() {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosAutor) => registrarAutor(revista, datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['autores'] }),
  })
}
