import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { corregirRegistro, listarPorCorregir } from '../services/migracionService'
import { useRevista } from '@/lib/revista/useRevista'

export function usePorCorregir() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['por-corregir', revista],
    queryFn: () => listarPorCorregir(revista),
  })
}

/** A correction changes the record, its journal's lists and the dashboard counters. */
export function useCorregirRegistro() {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: string }) =>
      corregirRegistro(revista, id, valor),
    onSuccess: () =>
      Promise.all(
        ['por-corregir', 'articulos', 'pares', 'tablero'].map((clave) =>
          cliente.invalidateQueries({ queryKey: [clave, revista] }),
        ),
      ).then(() => cliente.invalidateQueries({ queryKey: ['resumen'] })),
  })
}
