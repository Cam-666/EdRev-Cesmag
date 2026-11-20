/*
 * EncabezadoRevista — barra superior de 60 px que replica los encabezados reales de cada revista: el escudo a la
 * izquierda, la marca de la revista (logo para REEP, nombre en letras para IRE) y la insignia del ISSN a la derecha.
 * La paleta de la revista vive solo aquí y en la insignia del ISSN. REEP mantiene un velo oscuro detrás de la
 * zona izquierda para que el texto blanco conserve el contraste.
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
