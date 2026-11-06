/*
 * ArticuloParesPage — Pares y evaluación (/:revista/articulos/:id/pares).
 * Covers: RF-19, RF-20, RF-21, RF-22, RF-23, RF-28, HU-13, HU-14, HU-15, HU-16, HU-19.
 * Status: empty screen, built in phase 5.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ArticuloParesPage() {
  return (
    <PantallaVacia
      titulo="Pares y evaluación"
      fase={5}
      requisitos={[
        'RF-19',
        'RF-20',
        'RF-21',
        'RF-22',
        'RF-23',
        'RF-28',
        'HU-13',
        'HU-14',
        'HU-15',
        'HU-16',
        'HU-19',
      ]}
      encabezado="h2"
    />
  )
}
