import { useQuery } from '@tanstack/react-query'
import { obtenerArticulo } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'

/** Ficha del artículo: el artículo con sus autores y pares asignados. */
export function useArticulo(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'detalle', id],
    queryFn: () => obtenerArticulo(revista, id),
    enabled: id !== '',
  })
}
