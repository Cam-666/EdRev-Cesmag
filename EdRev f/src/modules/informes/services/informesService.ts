/*
 * informesService — HTTP calls of the management report. Covers: RF-38, HU-27.
 */
import { solicitar, solicitarArchivo } from '@/lib/api/cliente'
import type { FiltroRevistaInforme, Informe, PeriodoInforme } from '@/types/panel'

export function listarPeriodos(): Promise<PeriodoInforme[]> {
  return solicitar<PeriodoInforme[]>('/informes/periodos')
}

/** The report as a PDF document, built by the server: a section and charts for each journal. */
export function obtenerInformePdf(revista: FiltroRevistaInforme, periodo: string): Promise<Blob> {
  const q = new URLSearchParams({ revista, periodo })
  return solicitarArchivo(`/informes/pdf?${q.toString()}`)
}

export function obtenerInforme(revista: FiltroRevistaInforme, periodo: string): Promise<Informe> {
  const q = new URLSearchParams({ revista, periodo })
  return solicitar<Informe>(`/informes?${q.toString()}`)
}
