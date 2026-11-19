/*
 * FilaCorreoEnviado — one row of the sent-mail log (<tr>; use inside Tabla's renderFila).
 * Covers: RF-26 (mail log), RF-27 (failures), HU-18, HU-20.
 */
import type { ReactNode } from 'react'
import { DistintivoEstado } from './DistintivoEstado'
import type { EstadoDistintivo } from './DistintivoEstado'
import { formatearFechaHora } from '@/lib/format'

export interface FilaCorreoEnviadoProps {
  tipo: string
  destinatario: string
  /** OJS number of the article, when the log is not scoped to one article. */
  numeroOjs?: string
  /** ISO 8601 date-time. */
  fechaEnvio: string
  resultado: Extract<EstadoDistintivo, 'en-cola' | 'enviado' | 'rebotado' | 'fallido'>
  /** A bounced or failed mail already corrected and resent. */
  atendido?: boolean
  accion?: ReactNode
}

export function FilaCorreoEnviado({
  tipo,
  destinatario,
  numeroOjs,
  fechaEnvio,
  resultado,
  atendido = false,
  accion,
}: FilaCorreoEnviadoProps) {
  return (
    <tr className="h-fila border-t border-borde-base">
      <td className="px-4 text-cuerpo-15-enfasis text-texto-principal">{tipo}</td>
      <td className="px-4 text-cuerpo-13 text-texto-principal">{destinatario}</td>
      {numeroOjs !== undefined && <td className="px-4 text-cuerpo-13">{numeroOjs}</td>}
      <td className="px-4 text-cuerpo-13 text-texto-secundario">
        {formatearFechaHora(fechaEnvio)}
      </td>
      <td className="px-4">
        <DistintivoEstado estado={resultado} />
        {atendido && (
          <span className="ml-2 text-cuerpo-13 text-texto-secundario">Corregido y reenviado</span>
        )}
      </td>
      {accion !== undefined && <td className="px-4 text-right">{accion}</td>}
    </tr>
  )
}
