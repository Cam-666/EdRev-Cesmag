/*
 * EncabezadoRevista — 60 px top bar. The journal palette lives only here and in the ISSN pill.
 * Covers: RF-02 (journal separation shown in the UI), RNF-11 (title contrast).
 * REEP: a dark scrim sits behind the title and the title is limited to the first 30 % of the bar.
 */
import type { ReactNode } from 'react'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

export interface EncabezadoRevistaProps {
  revista: Revista
  /** Right-aligned actions (e.g. "Registrar artículo"). */
  acciones?: ReactNode
}

export function EncabezadoRevista({ revista, acciones }: EncabezadoRevistaProps) {
  const datos = REVISTAS[revista]
  return (
    <header
      data-revista={revista}
      className="relative flex h-barra items-center justify-between gap-4 bg-revista-barra px-6 text-texto-inverso"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-revista-velo" />
      <div className="relative min-w-0 max-w-titulo">
        <p className="text-micro-11 uppercase">{datos.etiquetaBarra}</p>
        <h1 className="text-titulo-16">{datos.tituloBarra}</h1>
      </div>
      <div className="relative flex items-center gap-4">
        <span className="rounded-full bg-revista-pastilla px-3 py-1 text-etiqueta-13 text-texto-inverso">
          ISSN {datos.issn}
        </span>
        {acciones}
      </div>
    </header>
  )
}
