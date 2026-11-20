import { useQuery } from '@tanstack/react-query'
import { obtenerHistorial } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'

/** Correos enviados y rastro de auditoría de un artículo: su «Historial de correos y cambios». */
export function useHistorial(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'historial', id],
    queryFn: () => obtenerHistorial(revista, id),
  })
}
