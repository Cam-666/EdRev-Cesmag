/*
 * EncabezadoComun — 60 px top bar for the cross-journal modules (Inicio general, Informes,
 * Administración). Neutral: it carries no journal palette. Covers: RF-37, RF-38, RF-40.
 */
import type { ReactNode } from 'react'

export interface EncabezadoComunProps {
  acciones?: ReactNode
}

export function EncabezadoComun({ acciones }: EncabezadoComunProps) {
  return (
    <header className="flex h-barra items-center justify-between gap-4 border-b border-borde-base bg-superficie-tarjeta px-6">
      <p className="text-micro-11 uppercase text-texto-secundario">
        Universidad CESMAG · Dependencia de Editorial
      </p>
      <div className="flex items-center gap-4">
        <span className="rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800">
          Las dos revistas
        </span>
        {acciones}
      </div>
    </header>
  )
}
