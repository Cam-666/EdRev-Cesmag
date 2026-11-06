/*
 * Alerta — inline message with symbol + text (info, warning, error, success).
 * Covers: RNF-12, RF-05 (antiplagio warning), RF-17 (conflict warning), RF-27 (send failure).
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type TipoAlerta = 'informacion' | 'advertencia' | 'error' | 'exito'

export interface AlertaProps {
  tipo: TipoAlerta
  titulo?: string
  children: ReactNode
  /** Optional action (button or link) aligned to the right. */
  accion?: ReactNode
  className?: string
}

const ESTILOS: Record<TipoAlerta, { caja: string; simbolo: string; etiqueta: string }> = {
  informacion: {
    caja: 'bg-estado-info-fondo text-estado-info border-estado-info',
    simbolo: 'i',
    etiqueta: 'Información',
  },
  advertencia: {
    caja: 'bg-estado-alerta-fondo text-estado-alerta border-estado-alerta',
    simbolo: '!',
    etiqueta: 'Advertencia',
  },
  error: {
    caja: 'bg-estado-error-fondo text-estado-error border-estado-error',
    simbolo: '✕',
    etiqueta: 'Error',
  },
  exito: {
    caja: 'bg-estado-exito-fondo text-estado-exito border-estado-exito',
    simbolo: '✓',
    etiqueta: 'Éxito',
  },
}

export function Alerta({ tipo, titulo, children, accion, className }: AlertaProps) {
  const { caja, simbolo, etiqueta } = ESTILOS[tipo]
  return (
    <div
      role={tipo === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-md border px-4 py-3', caja, className)}
    >
      <span
        aria-hidden="true"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-etiqueta-13"
      >
        {simbolo}
      </span>
      <div className="flex-1 text-cuerpo-13">
        <span className="sr-only">{etiqueta}: </span>
        {titulo && <p className="text-etiqueta-13">{titulo}</p>}
        <div>{children}</div>
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}
