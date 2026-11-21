/*
 * Hooks del módulo de constancias. Emitir toca muchas vistas (las listas de constancias, el registro de correos,
 * la alerta del tablero, la ficha del par y el historial del artículo), por eso cada mutación las refresca todas
 * para la revista activa.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  emitirConstancia,
  emitirPendientes,
  listarConstancias,
  obtenerVistaConstancia,
  reenviarConstancia,
} from '../services/constanciasService'
import { solicitarArchivo } from '@/lib/api/cliente'
import { useRevista } from '@/lib/revista/useRevista'
import type { EleccionCorreo } from '@/types/plantilla'

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

/** La constancia armada con la plantilla; solo se activa cuando hay una seleccionada. */
export function useVistaConstancia(constanciaId: string | null) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['constancias', revista, 'vista', constanciaId],
    queryFn: () => obtenerVistaConstancia(revista, constanciaId ?? ''),
    enabled: constanciaId !== null,
  })
}

/** El PDF de la constancia tal como lo recibirá el par; solo existe con el servidor real. */
export function useVistaPdfConstancia(constanciaId: string | null) {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['constancias', revista, 'pdf', constanciaId],
    queryFn: () => solicitarArchivo(`/${revista}/constancias/${encodeURIComponent(constanciaId ?? '')}/pdf`),
    enabled: constanciaId !== null && import.meta.env.VITE_USE_MOCKS === 'false',
  })
}

export function useEmitirConstancia() {
  const { revista } = useRevista()
  const invalidar = useInvalidarConstancias()
  return useMutation({
    mutationFn: ({
      constanciaId,
      conAgradecimiento,
      eleccion,
    }: {
      constanciaId: string
      conAgradecimiento: boolean
      eleccion?: EleccionCorreo
    }) => emitirConstancia(revista, constanciaId, conAgradecimiento, eleccion),
    onSuccess: invalidar,
  })
}

export function useEmitirPendientes() {
  const { revista } = useRevista()
  const invalidar = useInvalidarConstancias()
  return useMutation({
    mutationFn: ({ conAgradecimiento, eleccion }: { conAgradecimiento: boolean; eleccion?: EleccionCorreo }) =>
      emitirPendientes(revista, conAgradecimiento, eleccion),
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
