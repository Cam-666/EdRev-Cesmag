/*
 * mensajesService — llamadas HTTP para enviarle a mano un correo a un par o a un autor: las plantillas de
 * mensaje de una revista, la vista previa del correo y el envío.
 */
import { solicitar } from '@/lib/api/cliente'
import type { DestinoMensaje, MensajeEnviado, PlantillaDeMensaje, VistaPreviaMensaje } from '@/types/mensaje'
import type { PlantillaDeEnvio } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

/** Los dos correos que se envían solos: la invitación al asignar un par y el agradecimiento al emitir una constancia. */
export type FinEnvio = 'invitacion' | 'agradecimiento'

const json = (cuerpo: unknown) => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

export function listarPlantillasDeMensaje(revista: Revista): Promise<PlantillaDeMensaje[]> {
  return solicitar<PlantillaDeMensaje[]>(`/${revista}/mensajes/plantillas`)
}

/** Las plantillas de invitación o de agradecimiento de una revista, la predeterminada primero. */
export function listarPlantillasDeEnvio(revista: Revista, fin: FinEnvio): Promise<PlantillaDeEnvio[]> {
  return solicitar<PlantillaDeEnvio[]>(`/${revista}/correos/plantillas?fin=${fin}`)
}

/** El correo de invitación o de agradecimiento con su marco, para el texto que se está escribiendo. */
export function vistaCorreoDeEnvio(revista: Revista, fin: FinEnvio, cuerpo: string): Promise<{ html: string }> {
  return solicitar<{ html: string }>(`/${revista}/correos/vista-previa`, { method: 'POST', ...json({ fin, cuerpo }) })
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
