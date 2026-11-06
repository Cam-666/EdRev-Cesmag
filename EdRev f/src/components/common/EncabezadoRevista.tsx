/*
 * EncabezadoRevista — 60 px top bar. The journal palette lives only here and in the ISSN pill.
 * Mirrors the real journal headers: coat of arms at the left, then the journal title, ISSN pill
 * at the right. REEP: a dark scrim sits behind the title and the left group is limited to the
 * first 30 % of the bar so the white text keeps contrast. Covers: RF-02, RNF-11.
 */
import type { ReactNode } from 'react'
import { Escudo } from './Escudo'
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
      <div className="relative flex min-w-0 max-w-titulo items-center gap-3">
        <Escudo tamano="md" />
        <span aria-hidden="true" className="h-8 w-px shrink-0 bg-texto-inverso opacity-60" />
        <div className="min-w-0">
          <p className="text-micro-11 uppercase">{datos.etiquetaBarra}</p>
          <p className="text-titulo-16">{datos.tituloBarra}</p>
        </div>
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
