/*
 * ArticuloAutoresPage — Autores del artículo (/:revista/articulos/:id/autores).
 * Covers: RF-09, RF-36, HU-06.
 * Status: empty screen, built in phase 4.
 */
import { PantallaVacia } from '@/components/common/PantallaVacia'

export function ArticuloAutoresPage() {
  return (
    <PantallaVacia
      titulo="Autores del artículo"
      fase={4}
      requisitos={['RF-09', 'RF-36', 'HU-06']}
      encabezado="h2"
    />
  )
}
