/*
 * Tabla — semantic table: Micro 11 uppercase headers (th scope="col"), 44 px rows,
 * fully clickable row via a stretched real link, empty and loading states, horizontal scroll.
 * Covers: RNF-11, RNF-14 (horizontal scroll), RNF-01.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface ColumnaTabla<T> {
  clave: string
  encabezado: string
  render: (fila: T) => ReactNode
  className?: string
}

export interface TablaProps<T> {
  /** Accessible name of the table (rendered as a hidden caption). */
  etiqueta: string
  columnas: ColumnaTabla<T>[]
  filas: T[]
  obtenerClave: (fila: T) => string
  /** If provided, the whole row is clickable: the first cell holds a stretched link. */
  hrefFila?: (fila: T) => string
  /** Accessible name of each row link. */
  etiquetaEnlace?: (fila: T) => string
  cargando?: boolean
  vacio?: ReactNode
  /** Replaces the default row rendering; must return a <tr>. */
  renderFila?: (fila: T) => ReactNode
}

export function Tabla<T>({
  etiqueta,
  columnas,
  filas,
  obtenerClave,
  hrefFila,
  etiquetaEnlace,
  cargando = false,
  vacio = 'No hay registros para mostrar.',
  renderFila,
}: TablaProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-borde-base bg-superficie-tarjeta shadow-tarjeta">
      <table
        className="w-full border-collapse text-left text-cuerpo-15"
        aria-busy={cargando || undefined}
      >
        <caption className="sr-only">{etiqueta}</caption>
        <thead className="bg-superficie-sutil">
          <tr>
            {columnas.map((c) => (
              <th
                key={c.clave}
                scope="col"
                className={cn(
                  'px-4 py-2 text-micro-11 uppercase text-texto-secundario',
                  c.className,
                )}
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            Array.from({ length: 4 }, (_, i) => (
              <tr key={i} className="h-fila border-t border-borde-base">
                {columnas.map((c) => (
                  <td key={c.clave} className="px-4">
                    <span className="block h-3 animate-pulse rounded-sm bg-neutro-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : filas.length === 0 ? (
            <tr className="border-t border-borde-base">
              <td colSpan={columnas.length} className="px-4 py-8 text-center text-texto-secundario">
                {vacio}
              </td>
            </tr>
          ) : (
            filas.map((fila) =>
              renderFila ? (
                renderFila(fila)
              ) : (
                <tr
                  key={obtenerClave(fila)}
                  className={cn(
                    'relative h-fila border-t border-borde-base',
                    hrefFila && 'hover:bg-estado-info-fondo',
                  )}
                >
                  {columnas.map((c, i) => (
                    <td key={c.clave} className={cn('px-4', c.className)}>
                      {hrefFila && i === 0 ? (
                        <Link
                          to={hrefFila(fila)}
                          aria-label={etiquetaEnlace?.(fila)}
                          className="text-texto-enlace after:absolute after:inset-0 after:content-['']"
                        >
                          {c.render(fila)}
                        </Link>
                      ) : (
                        c.render(fila)
                      )}
                    </td>
                  ))}
                </tr>
              ),
            )
          )}
        </tbody>
      </table>
      {cargando && <p className="sr-only">Cargando datos…</p>}
    </div>
  )
}
