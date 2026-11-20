/* TarjetaMetrica — un número grande con su etiqueta (tablero de la revista, Inicio, informes). */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface TarjetaMetricaProps {
  valor: number | string
  etiqueta: string
  /** Enlace opcional al listado de los casos que hay detrás del número. */
  href?: string
  textoEnlace?: string
  /** Resalta las tarjetas de alerta (pendientes) con un símbolo de advertencia. */
  alerta?: boolean
  detalle?: ReactNode
}

export function TarjetaMetrica({
  valor,
  etiqueta,
  href,
  textoEnlace = 'Ver casos',
  alerta = false,
  detalle,
}: TarjetaMetricaProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border bg-superficie-tarjeta p-5 shadow-tarjeta print:gap-2 print:p-7',
        alerta ? 'border-estado-alerta' : 'border-borde-base',
      )}
    >
      <p className="flex items-baseline gap-2 text-display text-texto-principal print:text-[44px] print:leading-none">
        {alerta && (
          <span aria-hidden="true" className="text-titulo-20 text-estado-alerta">
            !
          </span>
        )}
        {valor}
      </p>
      <p className="text-cuerpo-13 text-texto-secundario print:text-[14px]">{etiqueta}</p>
      {detalle}
      {href && (
        <Link to={href} className="mt-1 text-etiqueta-13 text-texto-enlace">
          {textoEnlace}
          <span className="sr-only">: {etiqueta}</span>
        </Link>
      )}
    </div>
  )
}
