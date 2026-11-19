/*
 * ListaRondas — every round of the initial committee review, most recent first, with its result,
 * observations, date and user. Rounds are never overwritten. Covers: RF-07, HU-04 (criterion 1).
 */
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { abreviarNombre, formatearFechaHora } from '@/lib/format'
import type { RondaComite } from '@/types/articulo'

export interface ListaRondasProps {
  rondas: RondaComite[]
}

export function ListaRondas({ rondas }: ListaRondasProps) {
  if (rondas.length === 0) {
    return <p className="text-cuerpo-15 text-texto-secundario">Aún no hay rondas registradas.</p>
  }
  return (
    <ol aria-label="Rondas de la revisión del comité" className="flex flex-col gap-3">
      {[...rondas].reverse().map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-2 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-cuerpo-15-enfasis">Ronda {r.numero}</p>
            <DistintivoEstado estado={r.resultado} />
          </div>
          {r.observacion && <p className="text-cuerpo-15">{r.observacion}</p>}
          <p className="text-cuerpo-13 text-texto-secundario">
            {formatearFechaHora(r.fecha)} · {abreviarNombre(r.usuario)}
          </p>
        </li>
      ))}
    </ol>
  )
}
