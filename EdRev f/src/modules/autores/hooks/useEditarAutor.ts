import { useMutation, useQueryClient } from '@tanstack/react-query'
import { editarAutor } from '../services/autoresService'
import { useRevistaDatos } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'

export function useEditarAutor() {
  const revista = useRevistaDatos()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: Partial<DatosAutor> }) =>
      editarAutor(revista, id, datos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ['autores'] })
      void cliente.invalidateQueries({ queryKey: ['articulos'] })
    },
  })
}
