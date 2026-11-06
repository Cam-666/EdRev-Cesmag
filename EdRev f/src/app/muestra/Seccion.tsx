/*
 * Seccion — titled block of the design-system showcase (development only).
 */
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
