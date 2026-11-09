import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { articulosDeAutor, registrarAutor } from '../services/autoresService'
import { useRevista } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'

/** Articles of one author (RF-11); enabled only when an author is selected. */
export function useArticulosDeAutor(id: string | null) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['autores', revista, 'articulos', id],
    queryFn: () => articulosDeAutor(revista, id ?? ''),
    enabled: id !== null,
  })
}

export function useRegistrarAutor() {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosAutor) => registrarAutor(revista, datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['autores', revista] }),
  })
}
