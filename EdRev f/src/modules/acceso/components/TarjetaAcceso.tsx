/*
 * TarjetaAcceso — tarjeta blanca de 440 px (radio 12, sombra elevada) que comparten las tres pantallas de
 * acceso: escudo y nombre «EdRev Cesmag», título de la página (h1) y subtítulo.
 */
import type { ReactNode } from 'react'
import { Escudo } from '@/components/common/Escudo'

export interface TarjetaAccesoProps {
  titulo: string
  subtitulo: string
  children?: ReactNode
}

export function TarjetaAcceso({ titulo, subtitulo, children }: TarjetaAccesoProps) {
  return (
    <section className="flex w-full max-w-acceso flex-col gap-4 rounded-lg bg-superficie-tarjeta p-8 shadow-elevada">
      <div className="flex flex-col items-center gap-2 text-center">
        <Escudo tamano="lg" />
        <p className="text-titulo-20 text-cesmag-azul">EdRev Cesmag</p>
        <h1 className="text-titulo-24">{titulo}</h1>
        <p className="text-cuerpo-13 text-texto-secundario">{subtitulo}</p>
      </div>
      {children}
    </section>
  )
}
