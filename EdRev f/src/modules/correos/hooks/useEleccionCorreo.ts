/*
 * useEleccionCorreo — lo que se decide al enviar una invitación o un agradecimiento: con qué plantilla de la revista.
 * La plantilla recomendada (la predeterminada) sale elegida de entrada, así que en el caso normal no hay nada que decidir.
 */
import { useState } from 'react'
import { usePlantillasDeEnvio } from './useMensajes'
import type { FinEnvio } from '../services/mensajesService'
import type { EleccionCorreo } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

export function useEleccionCorreo(revista: Revista, fin: FinEnvio, activo = true) {
  const consulta = usePlantillasDeEnvio(revista, fin, activo)
  const lista = consulta.data ?? []
  const [idElegido, setIdElegido] = useState<string | null>(null)

  // Mientras no se elija otra (o si la elegida ya no existe) vale la primera de la lista: la recomendada.
  const plantilla = lista.find((p) => p.id === idElegido) ?? lista[0] ?? null
  const asunto = plantilla?.asunto ?? ''
  const cuerpo = plantilla?.cuerpo ?? null
  const eleccion: EleccionCorreo | undefined = plantilla ? { plantillaId: plantilla.id } : undefined

  return {
    revista,
    fin,
    consulta,
    lista,
    plantilla,
    asunto,
    cuerpo,
    /** Lo que se manda al servidor; nada si todavía no hay plantilla. */
    eleccion,
    elegir: (id: string) => setIdElegido(id),
  }
}

export type EleccionDeCorreo = ReturnType<typeof useEleccionCorreo>
