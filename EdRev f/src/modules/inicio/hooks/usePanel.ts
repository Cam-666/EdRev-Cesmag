import { useQuery } from '@tanstack/react-query'
import { obtenerResumen, obtenerTablero } from '../services/panelService'
import { useRevista } from '@/lib/revista/useRevista'

/** Tablero de la revista activa; la revista forma parte de la clave de la caché. */
export function useTablero() {
  const { revista } = useRevista()
  return useQuery({
    queryKey: ['tablero', revista],
    queryFn: () => obtenerTablero(revista),
  })
}

/** Resumen de las dos revistas (la pantalla de Inicio es la vista de las dos). */
export function useResumen() {
  return useQuery({ queryKey: ['resumen'], queryFn: obtenerResumen })
}
