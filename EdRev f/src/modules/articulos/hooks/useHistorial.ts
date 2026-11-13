import { useQuery } from '@tanstack/react-query'
import { obtenerHistorial } from '../services/articulosService'
import { useRevista } from '@/lib/revista/useRevista'

/** Mails sent and audit trail of an article: its «Historial de correos y cambios» (RF-26, RF-41). */
export function useHistorial(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'historial', id],
    queryFn: () => obtenerHistorial(revista, id),
  })
}
