/*
 * CampoTexto — text input with always-visible label tied by id and error via aria-describedby.
 * Covers: RNF-11 (labels associated to fields, error messages linked to their field), RNF-12.
 */
import { useId } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { MensajeError } from './MensajeError'
import { cn } from '@/lib/cn'

export interface CampoTextoProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  id?: string
  etiqueta: string
  ayuda?: string
  error?: string
  /** Control aligned to the right of the label (e.g. the "Mostrar" password toggle). */
  accionEtiqueta?: ReactNode
  /** Control placed inside the box, at its right end (e.g. the eye of a password). */
  accionInterna?: ReactNode
  /** Keeps the label for assistive technology only (e.g. a field inside a table row). */
  etiquetaOculta?: boolean
}

export function CampoTexto({
  id,
  etiqueta,
  ayuda,
  error,
  accionEtiqueta,
  accionInterna,
  etiquetaOculta = false,
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
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={idCampo}
          className={cn('text-etiqueta-13 text-texto-principal', etiquetaOculta && 'sr-only')}
        >
          {etiqueta}
          {required && (
            <span aria-hidden="true" className="text-estado-error">
              {' '}
              *
            </span>
          )}
        </label>
        {accionEtiqueta}
      </div>
      <div className="relative flex flex-col">
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
            accionInterna ? 'pr-11' : null,
            className,
          )}
        />
        {accionInterna && (
          <span className="absolute inset-y-0 right-2 flex items-center">{accionInterna}</span>
        )}
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-cuerpo-13 text-texto-secundario">
          {ayuda}
        </p>
      )}
      {error && <MensajeError id={idError}>{error}</MensajeError>}
    </div>
  )
}
