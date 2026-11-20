/* FilaCorreoEnviado — una fila del registro de correos enviados (<tr>; se usa dentro del renderFila de Tabla). */
import type { ReactNode } from 'react'
import { DistintivoEstado } from './DistintivoEstado'
import type { EstadoDistintivo } from './DistintivoEstado'
import { formatearFechaHora } from '@/lib/format'

export interface FilaCorreoEnviadoProps {
  tipo: string
  destinatario: string
  /** Número de OJS del artículo, cuando el registro no es de un solo artículo. */
  numeroOjs?: string
  /** Fecha y hora en formato ISO 8601. */
  fechaEnvio: string
  resultado: Extract<EstadoDistintivo, 'en-cola' | 'enviado' | 'rebotado' | 'fallido'>
  /** Un correo rebotado o fallido que ya se corrigió y se reenvió. */
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
