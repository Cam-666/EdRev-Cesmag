/*
 * AutoresPage — Autores (/:revista/autores).
 * Covers: RF-10, RF-11, RF-09, HU-07.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function AutoresPage() {
  return (
    <PantallaVacia titulo="Autores" fase={5} requisitos={['RF-10', 'RF-11', 'RF-09', 'HU-07']} />
  )
}
