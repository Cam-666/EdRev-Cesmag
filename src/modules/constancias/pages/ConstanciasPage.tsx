/*
 * ConstanciasPage — Constancias (/:revista/constancias).
 * Covers: RF-30, RF-31, RF-32, RF-33, RF-34, HU-21, HU-22, HU-23, HU-24.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ConstanciasPage() {
  return (
    <PantallaVacia
      titulo="Constancias"
      fase={6}
      requisitos={['RF-30', 'RF-31', 'RF-32', 'RF-33', 'RF-34', 'HU-21', 'HU-22', 'HU-23', 'HU-24']}
    />
  )
}
