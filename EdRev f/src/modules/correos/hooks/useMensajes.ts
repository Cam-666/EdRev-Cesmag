/*
 * Hooks para enviarle a mano un correo a un par o a un autor. Al enviar se refresca el registro de correos de la
 * revista desde la que sale el mensaje (ahí aparece como «Mensaje»).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enviarMensaje,
  listarPlantillasDeEnvio,
  listarPlantillasDeMensaje,
  vistaCorreoDeEnvio,
  vistaPreviaMensaje,
} from '../services/mensajesService'
import type { FinEnvio } from '../services/mensajesService'
import type { DestinoMensaje } from '@/types/mensaje'
import type { Revista } from '@/types/revista'

export function usePlantillasDeEnvio(revista: Revista, fin: FinEnvio, activo: boolean) {
  return useQuery({
    queryKey: ['correos', revista, 'plantillas-envio', fin],
    queryFn: () => listarPlantillasDeEnvio(revista, fin),
    enabled: activo,
  })
}

export function useVistaCorreoDeEnvio(revista: Revista, fin: FinEnvio, cuerpo: string | null) {
  return useQuery({
    queryKey: ['correos', revista, 'vista-envio', fin, cuerpo],
    queryFn: () => vistaCorreoDeEnvio(revista, fin, cuerpo ?? ''),
    enabled: cuerpo !== null,
    placeholderData: (anterior) => anterior,
  })
}

export function usePlantillasDeMensaje(revista: Revista, activo: boolean) {
  return useQuery({
    queryKey: ['mensajes', revista, 'plantillas'],
    queryFn: () => listarPlantillasDeMensaje(revista),
    enabled: activo,
  })
}

export function useVistaPreviaMensaje(revista: Revista, destino: DestinoMensaje, plantillaId: string | null) {
  return useQuery({
    queryKey: ['mensajes', revista, 'vista-previa', destino.tipo, destino.id, plantillaId],
    queryFn: () => vistaPreviaMensaje(revista, destino, plantillaId ?? ''),
    enabled: plantillaId !== null,
  })
}

export function useEnviarMensaje(revista: Revista) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ destino, plantillaId }: { destino: DestinoMensaje; plantillaId: string }) =>
      enviarMensaje(revista, destino, plantillaId),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['correos', revista] }),
  })
}
