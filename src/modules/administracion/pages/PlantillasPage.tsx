/*
 * PlantillasPage — Plantillas y cuentas de correo (/administracion/plantillas).
 * Covers: RNF-19, RNF-07, RF-25.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function PlantillasPage() {
  return (
    <PantallaVacia
      titulo="Plantillas y cuentas de correo"
      fase={6}
      requisitos={['RNF-19', 'RNF-07', 'RF-25']}
      encabezado="h2"
    />
  )
}
