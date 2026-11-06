/*
 * AccesoPage — Iniciar sesión (/acceso).
 * Covers: RF-39, HU-28, RNF-04, RNF-05, bloqueo 15 min: sin RF/HU, pendiente de incorporar.
 * Status: empty screen, built in phase 3.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function AccesoPage() {
  return (
    <PantallaVacia
      titulo="Iniciar sesión"
      fase={3}
      requisitos={[
        'RF-39',
        'HU-28',
        'RNF-04',
        'RNF-05',
        'bloqueo 15 min: sin RF/HU, pendiente de incorporar',
      ]}
    />
  )
}
