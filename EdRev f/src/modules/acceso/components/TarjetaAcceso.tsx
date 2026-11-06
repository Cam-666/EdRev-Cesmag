/*
 * TarjetaAcceso — white 440 px card (radius 12, elevated shadow) shared by the three access
 * screens: "UC" mark, page title (h1) and subtitle. Covers: HU-28.
 */
import type { ReactNode } from 'react'

export interface TarjetaAccesoProps {
  titulo: string
  subtitulo: string
  children: ReactNode
}

export function TarjetaAcceso({ titulo, subtitulo, children }: TarjetaAccesoProps) {
  return (
    <section className="flex w-full max-w-acceso flex-col gap-4 rounded-lg bg-superficie-tarjeta p-8 shadow-elevada">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-md bg-cesmag-azul text-titulo-16 text-texto-inverso"
        >
          UC
        </span>
        <h1 className="text-titulo-24">{titulo}</h1>
        <p className="text-cuerpo-13 text-texto-secundario">{subtitulo}</p>
      </div>
      {children}
    </section>
  )
}
