import { useQuery } from '@tanstack/react-query'
import { existeNumeroOjs } from '../services/articulosService'
import { useRetardo } from '@/lib/useRetardo'
import { useRevista } from '@/lib/revista/useRevista'

/** RF-03: warns when the typed OJS number already belongs to another article of this journal. */
export function useExisteNumeroOjs(numeroOjs: string) {
  const { revista } = useRevista()
  const numero = useRetardo(numeroOjs.trim(), 300)
  return useQuery({
    queryKey: ['articulos', revista, 'existe', numero],
    queryFn: () => existeNumeroOjs(revista, numero),
    enabled: numero !== '',
  })
}
