/*
 * useEleccionCorreo — lo que se decide al enviar una invitación o un agradecimiento: con qué plantilla de la revista
 * y, si hace falta, con un texto propio solo para ese envío. La plantilla predeterminada sale elegida de entrada,
 * así que en el caso normal no hay nada que decidir. Si se cambia de plantilla, el texto propio se descarta.
 */
import { useState } from 'react'
import { usePlantillasDeEnvio } from './useMensajes'
import type { FinEnvio } from '../services/mensajesService'
import type { EleccionCorreo } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

interface TextoPropio {
  plantillaId: string
  asunto: string
  cuerpo: string
}

export function useEleccionCorreo(revista: Revista, fin: FinEnvio, activo = true) {
  const consulta = usePlantillasDeEnvio(revista, fin, activo)
  const lista = consulta.data ?? []
  const [idElegido, setIdElegido] = useState<string | null>(null)
  const [propio, setPropio] = useState<TextoPropio | null>(null)

  // Mientras no se elija otra (o si la elegida ya no existe) vale la primera de la lista: la predeterminada.
  const plantilla = lista.find((p) => p.id === idElegido) ?? lista[0] ?? null
  const texto = propio && plantilla && propio.plantillaId === plantilla.id ? propio : null
  const asunto = texto?.asunto ?? plantilla?.asunto ?? ''
  const cuerpo = texto?.cuerpo ?? plantilla?.cuerpo ?? null
  const eleccion: EleccionCorreo | undefined = plantilla
    ? texto
      ? { plantillaId: plantilla.id, asunto: texto.asunto, cuerpo: texto.cuerpo }
      : { plantillaId: plantilla.id }
    : undefined

  return {
    revista,
    fin,
    consulta,
    lista,
    plantilla,
    asunto,
    cuerpo,
    /** Verdadero cuando se está escribiendo un texto propio para este envío. */
    editando: texto !== null,
    /** Lo que se manda al servidor; nada si todavía no hay plantilla. */
    eleccion,
    elegir: (id: string) => {
      setIdElegido(id)
      setPropio(null)
    },
    empezarAEditar: () => {
      if (plantilla) setPropio({ plantillaId: plantilla.id, asunto: plantilla.asunto, cuerpo: plantilla.cuerpo })
    },
    volverALaPlantilla: () => setPropio(null),
    cambiarAsunto: (valor: string) => setPropio((p) => (p ? { ...p, asunto: valor } : p)),
    cambiarCuerpo: (valor: string) => setPropio((p) => (p ? { ...p, cuerpo: valor } : p)),
  }
}

export type EleccionDeCorreo = ReturnType<typeof useEleccionCorreo>
