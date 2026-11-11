/*
 * EncabezadoRevista — 60 px top bar replicating the real journal headers: coat of arms at the
 * left, the journal brand (logo for REEP, wordmark for IRE), and the ISSN pill at the right.
 * The journal palette lives only here and in the ISSN pill. REEP keeps a dark scrim behind the
 * left zone so the white text keeps contrast. Covers: RF-02, RNF-11.
 */
import emblema from '@/assets/emblema-ire.webp'
import { Escudo } from './Escudo'
import { MarcaIre } from './MarcaIre'
import { MarcaReep } from './MarcaReep'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

export interface EncabezadoRevistaProps {
  revista: Revista
}

export function EncabezadoRevista({ revista }: EncabezadoRevistaProps) {
  const datos = REVISTAS[revista]
  return (
    <header
      data-revista={revista}
      className="relative flex h-barra items-center justify-between gap-4 border-t-2 border-cesmag-rojo bg-revista-barra px-6 text-texto-inverso"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-revista-velo" />
      <div className="relative flex shrink-0 items-center gap-3">
        <Escudo tamano="md" />
        <span aria-hidden="true" className="h-8 w-px shrink-0 bg-texto-inverso opacity-60" />
        <p className="text-micro-11 uppercase">Módulo {datos.modulo}</p>
      </div>

      {revista === 'reep' ? <MarcaReep /> : <MarcaIre />}

      <div className="relative flex shrink-0 items-center gap-4">
        <span className="rounded-full bg-revista-pastilla px-3 py-1 text-etiqueta-13 text-texto-inverso">
          ISSN: {datos.issn} ({datos.medioIssn})
        </span>
        {revista === 'ire' && <img src={emblema} alt="" className="hidden h-10 2xl:block" />}
      </div>
    </header>
  )
}
