/*
 * InformesPage — Informe de gestión (/informes).
 * Covers: RF-38, HU-27.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function InformesPage() {
  return <PantallaVacia titulo="Informe de gestión" fase={6} requisitos={['RF-38', 'HU-27']} />
}
