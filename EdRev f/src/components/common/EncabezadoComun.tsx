/*
 * EncabezadoComun — 60 px top bar for the cross-journal modules (Inicio, Informes,
 * Administración). Neutral: it carries no journal palette. Covers: RF-37, RF-38, RF-40.
 */
import { Escudo } from './Escudo'

export function EncabezadoComun() {
  return (
    <header className="flex h-barra items-center justify-between gap-4 border-b border-borde-base bg-superficie-tarjeta px-6">
      <div className="flex items-center gap-3">
        <Escudo tamano="md" />
        <p className="text-micro-11 uppercase text-texto-secundario">
          Universidad CESMAG · Dependencia de Editorial
        </p>
      </div>
    </header>
  )
}
