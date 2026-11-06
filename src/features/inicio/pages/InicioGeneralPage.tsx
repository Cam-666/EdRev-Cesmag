/*
 * InicioGeneralPage — Inicio general (/inicio).
 * Covers: RF-37, HU-25.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function InicioGeneralPage() {
  return <PantallaVacia titulo="Inicio general" fase={6} requisitos={['RF-37', 'HU-25']} />
}
