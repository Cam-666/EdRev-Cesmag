/*
 * ArticulosPage — Artículos (/:revista/articulos).
 * Covers: RF-35, HU-26, RF-02.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ArticulosPage() {
  return <PantallaVacia titulo="Artículos" fase={4} requisitos={['RF-35', 'HU-26', 'RF-02']} />
}
