/*
 * EncabezadoPagina — título de una pantalla con sus acciones al lado (por ejemplo «Registrar artículo»).
 * Las acciones van junto al título sobre el que actúan, en el contenido, no en la barra de la revista.
 * `children` es la línea bajo el título (conteos, paso, fecha).
 */
import type { ReactNode } from 'react'

export interface EncabezadoPaginaProps {
  titulo: ReactNode
  /** h1 para pantallas; h2 cuando la pantalla ya tiene su propio h1 (por ejemplo las pestañas de una ficha). */
  nivel?: 'h1' | 'h2'
  acciones?: ReactNode
  children?: ReactNode
}

export function EncabezadoPagina({
  titulo,
  nivel = 'h1',
  acciones,
  children,
}: EncabezadoPaginaProps) {
  const Titulo = nivel
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Titulo className={nivel === 'h1' ? 'text-titulo-24' : 'text-titulo-16'}>{titulo}</Titulo>
        {children}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  )
}
