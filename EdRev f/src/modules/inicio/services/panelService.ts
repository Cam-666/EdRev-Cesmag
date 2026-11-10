/*
 * panelService — HTTP calls of the dashboards: the journal dashboard and the home summary of both
 * journals. Covers: RF-37, HU-25.
 */
import { solicitar } from '@/lib/api/cliente'
import type { ResumenGeneral, Tablero } from '@/types/panel'
import type { Revista } from '@/types/revista'

export function obtenerTablero(revista: Revista): Promise<Tablero> {
  return solicitar<Tablero>(`/${revista}/tablero`)
}

export function obtenerResumen(): Promise<ResumenGeneral> {
  return solicitar<ResumenGeneral>('/resumen')
}
