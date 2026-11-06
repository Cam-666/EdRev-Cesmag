import { useMutation, useQuery } from '@tanstack/react-query'
import {
  agregarObservacion,
  listarObservaciones,
  obtenerHistorial,
} from '../services/articulosService'
import { useInvalidarArticulos } from './useInvalidarArticulos'
import { useRevista } from '@/lib/revista/useRevista'

/** Dated internal notes of an article, newest first (RF-07). */
export function useObservaciones(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'observaciones', id],
    queryFn: () => listarObservaciones(revista, id),
  })
}

export function useAgregarObservacion(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (texto: string) => agregarObservacion(revista, id, texto),
    onSuccess: invalidar,
  })
}

/** Mails sent and audit trail of an article (RF-26, RF-41). */
export function useHistorial(id: string) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['articulos', revista, 'historial', id],
    queryFn: () => obtenerHistorial(revista, id),
  })
}
