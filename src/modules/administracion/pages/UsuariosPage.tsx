/*
 * UsuariosPage — Usuarios y permisos (/administracion/usuarios).
 * Covers: RF-40, HU-29, RNF-05.
 * Status: empty screen, built in phase 6.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function UsuariosPage() {
  return (
    <PantallaVacia
      titulo="Usuarios y permisos"
      fase={6}
      requisitos={['RF-40', 'HU-29', 'RNF-05']}
      encabezado="h2"
    />
  )
}
