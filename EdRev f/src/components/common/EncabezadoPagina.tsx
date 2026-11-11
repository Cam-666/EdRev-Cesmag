/*
 * EncabezadoPagina — title of a screen with its actions beside it (e.g. "Registrar artículo").
 * The actions live next to the title they act on, in the content area, not in the journal bar.
 * `children` is the line under the title (counts, step, date). Covers: RNF-11.
 */
import type { ReactNode } from 'react'

export interface EncabezadoPaginaProps {
  titulo: ReactNode
  /** h1 for screens; h2 when the screen already has its own h1 (e.g. tabs of a record). */
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
