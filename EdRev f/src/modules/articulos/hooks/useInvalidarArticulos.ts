import { useQueryClient } from '@tanstack/react-query'
import { useRevista } from '@/lib/revista/useRevista'

/** Refreshes every cached article query of the active journal (list, sheet, history...). */
export function useInvalidarArticulos() {
  const cliente = useQueryClient()
  const { revista } = useRevista()
  return () => cliente.invalidateQueries({ queryKey: ['articulos', revista] })
}
