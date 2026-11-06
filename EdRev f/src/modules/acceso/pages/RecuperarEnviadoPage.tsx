/*
 * RecuperarEnviadoPage — Revise su correo (/acceso/recuperar/enviado).
 * Covers: sin RF/HU: pendiente de incorporar.
 * Status: empty screen, built in phase 3.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function RecuperarEnviadoPage() {
  return (
    <PantallaVacia
      titulo="Revise su correo"
      fase={3}
      requisitos={['sin RF/HU: pendiente de incorporar']}
    />
  )
}
