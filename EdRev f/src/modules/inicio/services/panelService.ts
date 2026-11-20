/* panelService — llamadas HTTP de los tableros: el tablero de la revista y el resumen de Inicio de las dos revistas. */
import { solicitar } from '@/lib/api/cliente'
import type { ResumenGeneral, Tablero } from '@/types/panel'
import type { Revista } from '@/types/revista'

export function obtenerTablero(revista: Revista): Promise<Tablero> {
  return solicitar<Tablero>(`/${revista}/tablero`)
}

export function obtenerResumen(): Promise<ResumenGeneral> {
  return solicitar<ResumenGeneral>('/resumen')
}
