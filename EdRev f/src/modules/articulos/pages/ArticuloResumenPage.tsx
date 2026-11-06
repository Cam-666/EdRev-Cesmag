/*
 * ArticuloResumenPage — Resumen tab (/:revista/articulos/:id): article data plus anti-plagiarism
 * and committee. Covers: RF-04, RF-05, RF-06, RF-36, HU-02, HU-03, HU-26.
 */
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
