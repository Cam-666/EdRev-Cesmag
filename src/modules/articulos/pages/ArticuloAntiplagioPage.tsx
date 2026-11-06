/*
 * ArticuloAntiplagioPage — Antiplagio y revisión del comité (/:revista/articulos/:id/antiplagio).
 * Covers: RF-05, RF-06, HU-02, HU-03.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ArticuloAntiplagioPage() {
  return (
    <PantallaVacia
      titulo="Antiplagio y revisión del comité"
      fase={4}
      requisitos={['RF-05', 'RF-06', 'HU-02', 'HU-03']}
    />
  )
}
