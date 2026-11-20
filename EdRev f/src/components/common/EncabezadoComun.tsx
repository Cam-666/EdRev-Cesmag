/*
 * EncabezadoComun — barra superior de 60 px de los módulos de las dos revistas (Inicio, Informes,
 * Administración). Es neutra: no lleva la paleta de ninguna revista.
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
