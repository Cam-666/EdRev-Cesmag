/*
 * ArticuloResumenPage — Resumen (/:revista/articulos/:id).
 * Covers: RF-04, RF-05, RF-06, RF-36, HU-02, HU-03, HU-26.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ArticuloResumenPage() {
  return (
    <PantallaVacia
      titulo="Resumen"
      fase={4}
      requisitos={['RF-04', 'RF-05', 'RF-06', 'RF-36', 'HU-02', 'HU-03', 'HU-26']}
      encabezado="h2"
    />
  )
}
