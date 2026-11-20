import { useQueryClient } from '@tanstack/react-query'
import { useRevista } from '@/lib/revista/useRevista'

/** Refresca todas las consultas de artículos en caché de la revista activa (listado, ficha, historial...). */
export function useInvalidarArticulos() {
  const cliente = useQueryClient()
  const { revista } = useRevista()
  return () => cliente.invalidateQueries({ queryKey: ['articulos', revista] })
}
