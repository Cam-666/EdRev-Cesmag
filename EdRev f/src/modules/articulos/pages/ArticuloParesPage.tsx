/*
 * ArticuloParesPage — Pares y evaluación tab (/:revista/articulos/:id/pares): assigned peers in
 * order with status, concept and delivery date. Read-only in phase 4; the assign / resend /
 * concept / delivery actions arrive in phase 5.
 * Covers: RF-19, RF-20, RF-21, RF-22, HU-13.
 */
import { ListaParesAsignados } from '../components/ListaParesAsignados'
import { useArticuloActual } from '../hooks/useArticuloActual'

export function ArticuloParesPage() {
  const articulo = useArticuloActual()
  return <ListaParesAsignados asignaciones={articulo.asignaciones} />
}
