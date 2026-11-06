/*
 * ArticuloNuevoPage — Registrar artículo · Datos (/:revista/articulos/nuevo).
 * Covers: RF-01, RF-03, RF-04, HU-01.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ArticuloNuevoPage() {
  return (
    <PantallaVacia
      titulo="Registrar artículo · Datos"
      fase={4}
      requisitos={['RF-01', 'RF-03', 'RF-04', 'HU-01']}
    />
  )
}
