/*
 * EncabezadoFicha — title block of the article sheet: "OJS · title", type and publication number,
 * and the summary badges (status, anti-plagiarism %, peers assigned). Symbol + text, never color
 * alone. Covers: RF-36, RF-05, RNF-12.
 */
import type { ReactNode } from 'react'
import { ETIQUETA_TIPO } from '../config/listas'
import { paresVigentes, superaUmbral } from '../config/reglas'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { etiquetaPublicacion } from '@/lib/dominio/publicacion'
import type { ArticuloDetalle } from '@/types/articulo'

export interface EncabezadoFichaProps {
  articulo: ArticuloDetalle
  /** Actions on the article, shown beside the title (e.g. "Editar"). */
  acciones?: ReactNode
}

export function EncabezadoFicha({ articulo, acciones }: EncabezadoFichaProps) {
  const { coincidencias, asignaciones } = articulo
  // Only those who accepted (or already delivered) are assigned; a peer who declined does not count.
  const asignados = paresVigentes(asignaciones).length
  const sinResponder = asignaciones.filter(
    (a) => a.estado === 'invitado' || a.estado === 'segundo-intento',
  ).length
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
        {articulo.publicacion && ` · ${etiquetaPublicacion(articulo.publicacion)}`}
      </p>
      <ul className="flex flex-wrap items-center gap-2">
        <li>
          <DistintivoEstado estado={articulo.estado} />
        </li>
        {articulo.migrado && (
          <li className="rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800">
            Migrado del Excel
          </li>
        )}
        {coincidencias !== null && (
          <li
            className={
              superaUmbral(coincidencias)
                ? 'rounded-full bg-estado-alerta-fondo px-3 py-1 text-etiqueta-13 text-estado-alerta'
                : 'rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800'
            }
          >
            {superaUmbral(coincidencias) && <span aria-hidden="true">! </span>}
            Antiplagio {coincidencias} %
          </li>
        )}
        <li className="rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800">
          {asignados === 1 ? '1 par asignado' : `${asignados} pares asignados`}
        </li>
        {sinResponder > 0 && (
          <li className="rounded-full bg-superficie-sutil px-3 py-1 text-etiqueta-13 text-neutro-800">
            {sinResponder === 1 ? '1 invitación sin responder' : `${sinResponder} invitaciones sin responder`}
          </li>
        )}
      </ul>
    </header>
  )
}
