/*
 * informesService — HTTP calls of the management report. Covers: RF-38, HU-27.
 */
import { solicitar } from '@/lib/api/cliente'
import type { FiltroRevistaInforme, Informe, PeriodoInforme } from '@/types/panel'

export function listarPeriodos(): Promise<PeriodoInforme[]> {
  return solicitar<PeriodoInforme[]>('/informes/periodos')
}

export function obtenerInforme(revista: FiltroRevistaInforme, periodo: string): Promise<Informe> {
  const q = new URLSearchParams({ revista, periodo })
  return solicitar<Informe>(`/informes?${q.toString()}`)
}
