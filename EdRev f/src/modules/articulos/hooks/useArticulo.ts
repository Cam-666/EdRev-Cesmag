import { useQuery } from '@tanstack/react-query'
import { obtenerArticulo } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'

/** Article sheet (RF-36): the article with its authors and assigned peers. */
export function useArticulo(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'detalle', id],
    queryFn: () => obtenerArticulo(revista, id),
    enabled: id !== '',
  })
}
