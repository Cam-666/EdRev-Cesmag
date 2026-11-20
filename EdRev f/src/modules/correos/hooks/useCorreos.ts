/*
 * Hooks del módulo de correos enviados. Reintentar cambia el registro, el historial del artículo y la alerta del
 * tablero, por eso cada mutación los refresca para la revista activa.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  corregirYReenviar,
  listarCorreos,
  reintentarCorreo,
  reintentarFallidos,
} from '../services/correosService'
import type { FiltrosCorreos } from '../services/correosService'
import { useRevista } from '@/lib/revista/useRevista'

function useInvalidarCorreos() {
  const cliente = useQueryClient()
  const { revista } = useRevista()
  return () =>
    Promise.all(
      ['correos', 'articulos', 'pares', 'tablero'].map((clave) =>
        cliente.invalidateQueries({ queryKey: [clave, revista] }),
      ),
    )
}

export function useCorreos(filtros: FiltrosCorreos) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['correos', revista, 'lista', filtros],
    queryFn: () => listarCorreos(revista, filtros),
    placeholderData: keepPreviousData,
  })
}

export function useReintentarCorreo() {
  const { revista } = useRevista()
  const invalidar = useInvalidarCorreos()
  return useMutation({
    mutationFn: (correoId: string) => reintentarCorreo(revista, correoId),
    onSuccess: invalidar,
  })
}

export function useReintentarFallidos() {
  const { revista } = useRevista()
  const invalidar = useInvalidarCorreos()
  return useMutation({ mutationFn: () => reintentarFallidos(revista), onSuccess: invalidar })
}

export function useCorregirYReenviar() {
  const { revista } = useRevista()
  const invalidar = useInvalidarCorreos()
  return useMutation({
    mutationFn: ({ correoId, correo }: { correoId: string; correo: string }) =>
      corregirYReenviar(revista, correoId, correo),
    onSuccess: invalidar,
  })
}
