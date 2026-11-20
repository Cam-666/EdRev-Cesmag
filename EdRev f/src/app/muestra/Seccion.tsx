/* Seccion — bloque con título del muestrario del sistema de diseño (solo desarrollo). */
import type { ReactNode } from 'react'

export interface SeccionProps {
  titulo: string
  children: ReactNode
}

export function Seccion({ titulo, children }: SeccionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-titulo-20">{titulo}</h2>
      {children}
    </section>
  )
}
