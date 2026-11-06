/*
 * ArticuloNuevoAutoresPage — Registrar artículo · Autores (/:revista/articulos/nuevo/autores).
 * Covers: RF-09, RF-10, HU-06, HU-07.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/design-system/PantallaVacia'

export function ArticuloNuevoAutoresPage() {
  return (
    <PantallaVacia
      titulo="Registrar artículo · Autores"
      fase={4}
      requisitos={['RF-09', 'RF-10', 'HU-06', 'HU-07']}
    />
  )
}
