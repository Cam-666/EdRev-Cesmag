/*
 * BotonVolver — enlace «← Volver a …» sobre el título de una pantalla que se abre desde otra (un artículo
 * desde el listado, un par desde la base, un autor desde el directorio). Es un enlace porque navega.
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
