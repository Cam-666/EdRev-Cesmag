/*
 * ListaAutoresBorrador — los autores elegidos hasta ahora en el formulario de registro, en orden (el primero es
 * el autor principal), cada uno con opción de quitarlo.
 */
import { MAX_AUTORES } from '../config/listas'
import type { AutorBorrador } from '../hooks/useBorradorArticulo'
import { Boton } from '@/components/common/Boton'

export interface ListaAutoresBorradorProps {
  autores: AutorBorrador[]
  onQuitar: (indice: number) => void
}

export function ListaAutoresBorrador({ autores, onQuitar }: ListaAutoresBorradorProps) {
  return (
    <section
      aria-labelledby="titulo-autores-borrador"
      className="flex flex-col gap-2 rounded-lg border border-borde-base bg-superficie-sutil p-4"
    >
      <div className="flex items-center justify-between">
        <h2 id="titulo-autores-borrador" className="text-cuerpo-15-enfasis">
          Autores del artículo
        </h2>
        <p className="text-etiqueta-13 text-texto-secundario">
          {autores.length} de {MAX_AUTORES}
        </p>
      </div>
      {autores.length === 0 ? (
        <p className="text-cuerpo-13 text-texto-secundario">
          Aún no hay autores. Busque una ficha existente o registre uno nuevo.
        </p>
      ) : (
        <ol className="gap-1.5 flex flex-col">
          {autores.map((a, i) => (
            <li
              key={`${a.autorId ?? a.datos.orcid}-${i}`}
              className="py-1.5 flex items-center gap-2 rounded-md bg-superficie-tarjeta px-2"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-superficie-sutil text-etiqueta-13"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-cuerpo-13 font-medium text-texto-principal">
                  {a.datos.nombre}
                  {i === 0 && (
                    <span className="rounded-full bg-estado-info-fondo px-2 text-etiqueta-13 text-estado-info">
                      Principal
                    </span>
                  )}
                </p>
                <p className="truncate text-micro-11 text-texto-secundario">
                  {[a.datos.orcid, a.datos.filiacion].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Boton variante="texto" tamano="sm" onClick={() => onQuitar(i)}>
                Quitar <span className="sr-only">a {a.datos.nombre}</span>
              </Boton>
            </li>
          ))}
        </ol>
      )}
      <p className="text-micro-11 text-texto-secundario">
        El orden identifica al autor principal y se conserva tal como se registró.
      </p>
    </section>
  )
}
