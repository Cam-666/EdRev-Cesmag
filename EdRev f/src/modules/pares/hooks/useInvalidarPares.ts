import { useQueryClient } from '@tanstack/react-query'

/**
 * Refresca las consultas de pares y de artículos de las dos revistas en caché. Asignar, responder o bloquear
 * cambia las dos: la ficha del par y la ficha del artículo.
 */
export function useInvalidarPares() {
  const cliente = useQueryClient()
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: ['pares'] }),
      cliente.invalidateQueries({ queryKey: ['articulos'] }),
    ])
}
