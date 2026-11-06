/*
 * CampoTexto — text input with always-visible label tied by id and error via aria-describedby.
 * Covers: RNF-11 (labels associated to fields, error messages linked to their field), RNF-12.
 */
import { useId } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { MensajeError } from './MensajeError'
import { cn } from '@/lib/cn'

export interface CampoTextoProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  id?: string
  etiqueta: string
  ayuda?: string
  error?: string
}

export function CampoTexto({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  required,
  ...resto
}: CampoTextoProps) {
  const generado = useId()
  const idCampo = id ?? generado
  const idError = `${idCampo}-error`
  const idAyuda = `${idCampo}-ayuda`
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-etiqueta-13 text-texto-principal">
        {etiqueta}
        {required && (
          <span aria-hidden="true" className="text-estado-error">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        {...resto}
        id={idCampo}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'min-h-control rounded-md border bg-superficie-tarjeta px-3 text-cuerpo-15 text-texto-principal',
          'placeholder:text-texto-placeholder',
          'focus-visible:border-borde-foco',
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
