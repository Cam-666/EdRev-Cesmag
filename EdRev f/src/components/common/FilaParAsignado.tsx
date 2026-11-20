/* FilaParAsignado — un par asignado en la ficha del artículo: orden, estado, concepto y fecha de entrega. */
import type { ReactNode } from 'react'
import { DistintivoEstado } from './DistintivoEstado'
import type { EstadoDistintivo } from './DistintivoEstado'
import { formatearFecha } from '@/lib/format'

export interface FilaParAsignadoProps {
  orden: number
  nombre: string
  universidad: string
  estado: EstadoDistintivo
  concepto?: string | null
  /** Fecha en formato ISO 8601. */
  fechaEntrega?: string | null
  esDesempate?: boolean
  constanciaEmitida?: boolean
  /** Acciones de la fila (reenviar la invitación, marcar la entrega, registrar el concepto…). */
  acciones?: ReactNode
}

export function FilaParAsignado({
  orden,
  nombre,
  universidad,
  estado,
  concepto,
  fechaEntrega,
  esDesempate = false,
  constanciaEmitida = false,
  acciones,
}: FilaParAsignadoProps) {
  return (
    <li className="flex flex-wrap items-center gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-4 shadow-tarjeta">
      <span
        aria-label={`Par ${orden}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estado-info-fondo text-etiqueta-13 text-estado-info"
      >
        {orden}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-cuerpo-15-enfasis text-texto-principal">
          {nombre}
          {esDesempate && (
            <span className="rounded-full bg-superficie-sutil px-2 text-etiqueta-13 text-neutro-800">
              Desempate
            </span>
          )}
        </p>
        <p className="text-cuerpo-13 text-texto-secundario">{universidad}</p>
      </div>
      <dl className="flex gap-6 text-cuerpo-13">
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Concepto</dt>
          <dd className="text-texto-principal">{concepto ?? 'Sin registrar'}</dd>
        </div>
        <div>
          <dt className="text-micro-11 uppercase text-texto-secundario">Fecha de entrega</dt>
          <dd className="text-texto-principal">
            {fechaEntrega ? formatearFecha(fechaEntrega) : '—'}
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-2">
        <DistintivoEstado estado={estado} />
        {constanciaEmitida && <DistintivoEstado estado="emitida" />}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </li>
  )
}
