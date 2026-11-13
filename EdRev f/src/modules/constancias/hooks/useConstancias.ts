/*
 * Hooks of the constancias module. Issuing touches many views (the constancias lists, the mail
 * log, the dashboard alert, the peer record and the article history), so every mutation refreshes
 * all of them for the active journal. Covers: RF-30..RF-34.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emitirConstancia,
  emitirPendientes,
  listarConstancias,
  obtenerVistaConstancia,
  reenviarConstancia,
} from '../services/constanciasService'
import { useRevista } from '@/lib/revista/useRevista'

function useInvalidarConstancias() {
  const cliente = useQueryClient()
  const { revista } = useRevista()
  return () =>
    Promise.all(
      ['constancias', 'correos', 'tablero', 'articulos', 'pares'].map((clave) =>
        cliente.invalidateQueries({ queryKey: [clave, revista] }),
      ),
    ).then(() => cliente.invalidateQueries({ queryKey: ['resumen'] }))
}

export function useConstancias() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['constancias', revista, 'lista'],
    queryFn: () => listarConstancias(revista),
  })
}

/** The constancia rendered from the template; enabled only when one is selected. */
export function useVistaConstancia(constanciaId: string | null) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['constancias', revista, 'vista', constanciaId],
    queryFn: () => obtenerVistaConstancia(revista, constanciaId ?? ''),
    enabled: constanciaId !== null,
  })
}

export function useEmitirConstancia() {
  const { revista } = useRevista()
  const invalidar = useInvalidarConstancias()
  return useMutation({
    mutationFn: ({ constanciaId, conAgradecimiento }: { constanciaId: string; conAgradecimiento: boolean }) =>
      emitirConstancia(revista, constanciaId, conAgradecimiento),
    onSuccess: invalidar,
  })
}

export function useEmitirPendientes() {
  const { revista } = useRevista()
  const invalidar = useInvalidarConstancias()
  return useMutation({
    mutationFn: (conAgradecimiento: boolean) => emitirPendientes(revista, conAgradecimiento),
    onSuccess: invalidar,
  })
}

export function useReenviarConstancia() {
  const { revista } = useRevista()
  const invalidar = useInvalidarConstancias()
  return useMutation({
    mutationFn: (constanciaId: string) => reenviarConstancia(revista, constanciaId),
    onSuccess: invalidar,
  })
}
