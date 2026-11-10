import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listarPeriodos, obtenerInforme } from '../services/informesService'
import type { FiltroRevistaInforme } from '@/types/panel'

export function usePeriodos() {
  return useQuery({ queryKey: ['informes', 'periodos'], queryFn: listarPeriodos })
}

/** The report of a period; stays disabled until a period is chosen. */
export function useInforme(revista: FiltroRevistaInforme, periodo: string | null) {
  return useQuery({
    queryKey: ['informes', revista, periodo],
    queryFn: () => obtenerInforme(revista, periodo ?? ''),
    enabled: periodo !== null,
    placeholderData: keepPreviousData,
  })
}
