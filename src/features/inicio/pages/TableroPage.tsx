/*
 * TableroPage — Tablero (/:revista/tablero).
 * Covers: RF-37, HU-25, RF-02.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function TableroPage() {
  return <PantallaVacia titulo="Tablero" fase={6} requisitos={['RF-37', 'HU-25', 'RF-02']} />
}
