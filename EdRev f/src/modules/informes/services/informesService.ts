/* informesService — llamadas HTTP del informe de gestión. */
import { solicitar, solicitarArchivo } from '@/lib/api/cliente'
import type { FiltroRevistaInforme, Informe, PeriodoInforme } from '@/types/panel'

export function listarPeriodos(): Promise<PeriodoInforme[]> {
  return solicitar<PeriodoInforme[]>('/informes/periodos')
}

/** El informe como documento PDF que arma el servidor: una sección y gráficas por cada revista. */
export function obtenerInformePdf(revista: FiltroRevistaInforme, periodo: string): Promise<Blob> {
  const q = new URLSearchParams({ revista, periodo })
  return solicitarArchivo(`/informes/pdf?${q.toString()}`)
}

export function obtenerInforme(revista: FiltroRevistaInforme, periodo: string): Promise<Informe> {
  const q = new URLSearchParams({ revista, periodo })
  return solicitar<Informe>(`/informes?${q.toString()}`)
}
