/*
 * mensajesService — llamadas HTTP para enviarle a mano un correo a un par o a un autor: las plantillas de
 * mensaje de una revista, la vista previa del correo y el envío.
 */
import { solicitar } from '@/lib/api/cliente'
import type { DestinoMensaje, MensajeEnviado, PlantillaDeMensaje, VistaPreviaMensaje } from '@/types/mensaje'
import type { Revista } from '@/types/revista'

const json = (cuerpo: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

export function listarPlantillasDeMensaje(revista: Revista): Promise<PlantillaDeMensaje[]> {
  return solicitar<PlantillaDeMensaje[]>(`/${revista}/mensajes/plantillas`)
}

export function vistaPreviaMensaje(
  revista: Revista,
  destino: DestinoMensaje,
  plantillaId: string,
): Promise<VistaPreviaMensaje> {
  return solicitar<VistaPreviaMensaje>(`/${revista}/mensajes/vista-previa`, {
    method: 'POST',
    ...json({ destino, plantillaId }),
  })
}

export function enviarMensaje(
  revista: Revista,
  destino: DestinoMensaje,
  plantillaId: string,
): Promise<MensajeEnviado> {
  return solicitar<MensajeEnviado>(`/${revista}/mensajes`, {
    method: 'POST',
    ...json({ destino, plantillaId }),
  })
}
