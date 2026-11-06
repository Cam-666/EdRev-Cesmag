/*
 * ListaObservaciones — dated internal notes, newest first, each with its author. A new note
 * never overwrites an earlier one. Covers: RF-07, HU-04.
 */
import { abreviarNombre, formatearFechaHora } from '@/lib/format'
import type { Observacion } from '@/types/historial'

export interface ListaObservacionesProps {
  observaciones: Observacion[]
}

export function ListaObservaciones({ observaciones }: ListaObservacionesProps) {
  if (observaciones.length === 0) {
    return (
      <p className="text-cuerpo-13 text-texto-secundario">Aún no hay observaciones registradas.</p>
    )
  }
  return (
    <ul aria-label="Observaciones registradas" className="flex flex-col gap-3">
      {observaciones.map((o) => (
        <li
          key={o.id}
          className="flex flex-col gap-1 rounded-lg border border-borde-base bg-superficie-tarjeta p-4 shadow-tarjeta"
        >
          <p className="text-cuerpo-15 text-texto-principal">{o.texto}</p>
          <p className="text-cuerpo-13 text-texto-secundario">
            {formatearFechaHora(o.fecha)} · {abreviarNombre(o.usuario)}
          </p>
        </li>
      ))}
    </ul>
  )
}
