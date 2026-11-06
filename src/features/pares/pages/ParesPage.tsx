/*
 * ParesPage — Pares evaluadores (/:revista/pares).
 * Covers: RF-12, RF-13, RF-14, RNF-06, HU-08, HU-09.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ParesPage() {
  return (
    <PantallaVacia
      titulo="Pares evaluadores"
      fase={5}
      requisitos={['RF-12', 'RF-13', 'RF-14', 'RNF-06', 'HU-08', 'HU-09']}
    />
  )
}
