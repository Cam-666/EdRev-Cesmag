import { useMutation, useQueryClient } from '@tanstack/react-query'
import { editarAutor } from '../services/autoresService'
import { useRevista } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'

export function useEditarAutor() {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: Partial<DatosAutor> }) =>
      editarAutor(revista, id, datos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['autores', revista] })
      void cliente.invalidateQueries({ queryKey: ['articulos', revista] })
    },
  })
}
