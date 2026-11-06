/*
 * ArticuloObservacionesPage — Observaciones (/:revista/articulos/:id/observaciones).
 * Covers: RF-07, HU-04.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ArticuloObservacionesPage() {
  return (
    <PantallaVacia
      titulo="Observaciones"
      fase={4}
      requisitos={['RF-07', 'HU-04']}
      encabezado="h2"
    />
  )
}
