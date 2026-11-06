/*
 * ParesAsignarPage — Asignar par evaluador (/:revista/pares/asignar).
 * Covers: RF-17, RF-19, RF-24, RF-25, RF-27, HU-12, HU-13, HU-17, HU-18.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ParesAsignarPage() {
  return (
    <PantallaVacia
      titulo="Asignar par evaluador"
      fase={5}
      requisitos={['RF-17', 'RF-19', 'RF-24', 'RF-25', 'RF-27', 'HU-12', 'HU-13', 'HU-17', 'HU-18']}
    />
  )
}
