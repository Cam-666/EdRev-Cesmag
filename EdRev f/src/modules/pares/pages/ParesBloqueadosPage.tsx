/*
 * ParesBloqueadosPage — Pares bloqueados (/:revista/pares/bloqueados).
 * Covers: RF-15, RF-16, HU-10, HU-11.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ParesBloqueadosPage() {
  return (
    <PantallaVacia
      titulo="Pares bloqueados"
      fase={5}
      requisitos={['RF-15', 'RF-16', 'HU-10', 'HU-11']}
    />
  )
}
