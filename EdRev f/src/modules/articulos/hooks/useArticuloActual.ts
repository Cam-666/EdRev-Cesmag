import { useOutletContext } from 'react-router-dom'
import type { ArticuloDetalle } from '@/types/articulo'

/** El artículo de la ficha, que FichaArticuloLayout entrega a cada pestaña. */
export function useArticuloActual(): ArticuloDetalle {
  return useOutletContext<ArticuloDetalle>()
}
