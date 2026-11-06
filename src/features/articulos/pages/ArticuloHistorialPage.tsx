/*
 * ArticuloHistorialPage — Historial (/:revista/articulos/:id/historial).
 * Covers: RF-26, RF-41, HU-20, HU-30.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ArticuloHistorialPage() {
  return (
    <PantallaVacia
      titulo="Historial"
      fase={4}
      requisitos={['RF-26', 'RF-41', 'HU-20', 'HU-30']}
      encabezado="h2"
    />
  )
}
