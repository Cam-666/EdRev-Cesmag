/* ArticuloResumenPage — pestaña Resumen (/:revista/articulos/:id): los datos del artículo más el antiplagio y el comité. */
import { DatosArticulo } from '../components/DatosArticulo'
import { PanelAntiplagio } from '../components/PanelAntiplagio'
import { useArticuloActual } from '../hooks/useArticuloActual'

export function ArticuloResumenPage() {
  const articulo = useArticuloActual()
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <DatosArticulo articulo={articulo} />
      <PanelAntiplagio articulo={articulo} />
    </div>
  )
}
