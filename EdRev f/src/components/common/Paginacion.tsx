/* Paginacion — navegación entre páginas con el resumen «1–6 de 142». Los listados largos van paginados. */
import { cn } from '@/lib/cn'

export interface PaginacionProps {
  /** Página actual, empezando en 1. */
  pagina: number
  porPagina: number
  total: number
  onCambiar: (pagina: number) => void
}

/** Páginas que se muestran: la primera, la última y las vecinas de la actual; null = puntos suspensivos. */
export function paginasVisibles(pagina: number, totalPaginas: number): Array<number | null> {
  const set = new Set<number>([1, totalPaginas, pagina - 1, pagina, pagina + 1])
  const ordenadas = [...set].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b)
  const salida: Array<number | null> = []
  ordenadas.forEach((p, i) => {
    const anterior = ordenadas[i - 1]
    if (anterior !== undefined && p - anterior > 1) salida.push(null)
    salida.push(p)
  })
  return salida
}

const FLECHA =
  'text-texto-enlace hover:bg-estado-info-fondo disabled:text-texto-secundario disabled:hover:bg-transparent'

const BASE =
  'inline-flex min-h-control-sm min-w-control-sm items-center justify-center rounded-md px-2 text-etiqueta-13'

export function Paginacion({ pagina, porPagina, total, onCambiar }: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const hasta = Math.min(total, pagina * porPagina)

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-cuerpo-13 text-texto-secundario">
        {desde}–{hasta} de {total}
      </p>
      <nav aria-label="Paginación">
        <ul className="flex items-center gap-1">
          <li>
            <button
              type="button"
              className={cn(BASE, FLECHA)}
              disabled={pagina <= 1}
              onClick={() => onCambiar(pagina - 1)}
            >
              <span aria-hidden="true">‹</span>
              <span className="sr-only">Página anterior</span>
            </button>
          </li>
          {paginasVisibles(pagina, totalPaginas).map((p, i) =>
            p === null ? (
              <li key={`e${i}`} aria-hidden="true" className="px-1 text-texto-secundario">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  aria-current={p === pagina ? 'page' : undefined}
                  aria-label={`Página ${p}`}
                  className={cn(
                    BASE,
                    p === pagina
                      ? 'bg-cesmag-azul text-texto-inverso'
                      : 'text-texto-enlace hover:bg-estado-info-fondo',
                  )}
                  onClick={() => onCambiar(p)}
                >
                  {p}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              className={cn(BASE, FLECHA)}
              disabled={pagina >= totalPaginas}
              onClick={() => onCambiar(pagina + 1)}
            >
              <span aria-hidden="true">›</span>
              <span className="sr-only">Página siguiente</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
