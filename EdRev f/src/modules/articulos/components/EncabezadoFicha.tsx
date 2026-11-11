/*
 * EncabezadoFicha — title block of the article sheet: "OJS · title", type and publication number,
 * and the summary badges (status, anti-plagiarism %, peers assigned). Symbol + text, never color
 * alone. Covers: RF-36, RF-05, RNF-12.
 */
import type { ReactNode } from 'react'
import { ETIQUETA_TIPO } from '../config/listas'
import { superaUmbral } from '../config/reglas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import type { ArticuloDetalle } from '@/types/articulo'

export interface EncabezadoFichaProps {
  articulo: ArticuloDetalle
  /** Actions on the article, shown beside the title (e.g. "Editar"). */
  acciones?: ReactNode
}

export function EncabezadoFicha({ articulo, acciones }: EncabezadoFichaProps) {
  const { antiplagio, asignaciones } = articulo
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="min-w-0 text-titulo-24">
          {articulo.numeroOjs} · {articulo.titulo}
        </h1>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      <p className="text-cuerpo-13 text-texto-secundario">
        {ETIQUETA_TIPO[articulo.tipo]}
        {articulo.numeroPublicacion && ` · ${articulo.numeroPublicacion}`}
      </p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <DistintivoEstado estado={articulo.estado} />
        </li>
        {antiplagio && (
          <li
            className={
              superaUmbral(antiplagio.coincidencias)
                ? 'rounded-full bg-estado-alerta-fondo px-3 py-1 text-etiqueta-13 text-estado-alerta'
                : 'rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800'
            }
          >
            {superaUmbral(antiplagio.coincidencias) && <span aria-hidden="true">! </span>}
            Antiplagio {antiplagio.coincidencias} %
          </li>
        )}
        <li className="rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800">
          {asignaciones.length === 1 ? '1 par asignado' : `${asignaciones.length} pares asignados`}
        </li>
      </ul>
    </header>
  )
}
