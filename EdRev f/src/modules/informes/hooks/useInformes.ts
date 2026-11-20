import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { listarPeriodos, obtenerInforme, obtenerInformePdf } from '../services/informesService'
import { descargarArchivo } from '@/lib/descarga'
import type { FiltroRevistaInforme } from '@/types/panel'

export function usePeriodos() {
  return useQuery({ queryKey: ['informes', 'periodos'], queryFn: listarPeriodos })
}

/** Descarga el informe del periodo como documento PDF. */
export function useDescargarInformePdf() {
  return useMutation({
    mutationFn: async ({ revista, periodo }: { revista: FiltroRevistaInforme; periodo: string }) => {
      const pdf = await obtenerInformePdf(revista, periodo)
      descargarArchivo(`informe-de-gestion-${periodo}-${revista}.pdf`, pdf)
    },
  })
}

/** El informe de un periodo; queda desactivado hasta que se elige un periodo. */
export function useInforme(revista: FiltroRevistaInforme, periodo: string | null) {
  return useQuery({
    queryKey: ['informes', revista, periodo],
    queryFn: () => obtenerInforme(revista, periodo ?? ''),
    enabled: periodo !== null,
    placeholderData: keepPreviousData,
  })
}
