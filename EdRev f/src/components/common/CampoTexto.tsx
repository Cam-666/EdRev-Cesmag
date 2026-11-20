/*
 * CampoTexto — campo de texto con la etiqueta siempre visible, enlazada por id, y el error enlazado con
 * aria-describedby.
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
  /** Control alineado a la derecha de la etiqueta (por ejemplo el botón «Mostrar» de la contraseña). */
  accionEtiqueta?: ReactNode
  /** Control puesto dentro de la caja, en su extremo derecho (por ejemplo el ojo de la contraseña). */
  accionInterna?: ReactNode
  /** Deja la etiqueta solo para lectores de pantalla (por ejemplo, un campo dentro de la fila de una tabla). */
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
