import { useOutletContext } from 'react-router-dom'
import type { ArticuloDetalle } from '@/types/articulo'

/** The article of the sheet, provided by FichaArticuloLayout to every tab. */
export function useArticuloActual(): ArticuloDetalle {
  return useOutletContext<ArticuloDetalle>()
}
