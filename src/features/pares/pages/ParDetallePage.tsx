/*
 * ParDetallePage — Ficha del par evaluador (/:revista/pares/:id).
 * Covers: RF-18, RNF-06, HU-23.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ParDetallePage() {
  return (
    <PantallaVacia
      titulo="Ficha del par evaluador"
      fase={5}
      requisitos={['RF-18', 'RNF-06', 'HU-23']}
    />
  )
}
