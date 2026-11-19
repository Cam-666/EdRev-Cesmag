/*
 * BotonVolver — "← Volver a …" link above the title of a screen opened from another one
 * (an article from the list, a peer from the base, an author from the directory).
 * It is a link because it navigates. Covers: RNF-11 (usability, HU-07 criterion 4).
 */
import type { ReactNode } from 'react'
import { EnlaceBoton } from './EnlaceBoton'

export interface BotonVolverProps {
  to: string
  children: ReactNode
}

export function BotonVolver({ to, children }: BotonVolverProps) {
  return (
    <EnlaceBoton variante="texto" tamano="sm" to={to} className="-ml-3 w-fit">
      <span aria-hidden="true">←</span> {children}
    </EnlaceBoton>
  )
}
