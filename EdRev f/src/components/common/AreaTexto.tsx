/*
 * AreaTexto — multi-line field with an always-visible label tied by id and its error linked by
 * aria-describedby. Covers: RNF-11 (labels associated to fields, errors linked to their field).
 */
import { useId } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { MensajeError } from './MensajeError'
import { cn } from '@/lib/cn'

export interface AreaTextoProps extends Omit<ComponentPropsWithRef<'textarea'>, 'id'> {
  id?: string
  etiqueta: string
  ayuda?: string
  error?: string
}

export function AreaTexto({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  rows = 4,
  ...resto
}: AreaTextoProps) {
  const generado = useId()
  const idCampo = id ?? generado
  const idError = `${idCampo}-error`
  const idAyuda = `${idCampo}-ayuda`
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-etiqueta-13 text-texto-principal">
        {etiqueta}
      </label>
      <textarea
        {...resto}
        id={idCampo}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'rounded-md border bg-superficie-tarjeta px-3 py-2 text-cuerpo-15 text-texto-principal',
          'placeholder:text-texto-placeholder focus-visible:border-borde-foco',
          'disabled:cursor-not-allowed disabled:bg-superficie-sutil disabled:text-texto-secundario',
          error ? 'border-estado-error' : 'border-borde-control',
          className,
        )}
      />
      {ayuda && (
        <p id={idAyuda} className="text-cuerpo-13 text-texto-secundario">
          {ayuda}
        </p>
      )}
      {error && <MensajeError id={idError}>{error}</MensajeError>}
    </div>
  )
}
