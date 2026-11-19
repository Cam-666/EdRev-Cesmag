import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { listarPeriodos, obtenerInforme, obtenerInformePdf } from '../services/informesService'
import { descargarArchivo } from '@/lib/descarga'
import type { FiltroRevistaInforme } from '@/types/panel'

export function usePeriodos() {
  return useQuery({ queryKey: ['informes', 'periodos'], queryFn: listarPeriodos })
}

/** Downloads the report of the period as a PDF document. */
export function useDescargarInformePdf() {
  return useMutation({
    mutationFn: async ({ revista, periodo }: { revista: FiltroRevistaInforme; periodo: string }) => {
      const pdf = await obtenerInformePdf(revista, periodo)
      descargarArchivo(`informe-de-gestion-${periodo}-${revista}.pdf`, pdf)
    },
  })
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
