/*
 * SeccionInforme — numbered section of the report (heading plus content). When printed, a
 * heading never stays alone at the end of a page. Covers: RF-38, HU-27.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SeccionInformeProps {
  numero: number
  titulo: string
  /** When printed, the section starts on a new page. */
  nuevaPagina?: boolean
  children: ReactNode
}

export function SeccionInforme({ numero, titulo, nuevaPagina = false, children }: SeccionInformeProps) {
  const id = `seccion-informe-${numero}`
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col gap-5 print:gap-6', nuevaPagina && 'print:break-before-page')}
    >
      <h2
        id={id}
        className="flex items-baseline gap-3 break-after-avoid border-b border-borde-base pb-3 text-titulo-16"
      >
        <span aria-hidden="true" className="text-texto-enlace">
          {numero}.
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}
