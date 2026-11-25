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
  /**
   * Campo para buscar (no para escribir un dato): lleva una lupa a la izquierda y un fondo azul suave, para que no
   * se confunda con los campos de un formulario.
   */
  busqueda?: boolean
  /** Deja la etiqueta solo para lectores de pantalla (por ejemplo, un campo dentro de la fila de una tabla). */
  etiquetaOculta?: boolean
}

function IconoLupa() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

export function CampoTexto({
  id,
  etiqueta,
  ayuda,
  error,
  accionEtiqueta,
  accionInterna,
  busqueda = false,
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
            'min-h-control rounded-md border px-3 text-cuerpo-15 text-texto-principal',
            busqueda ? 'bg-estado-info-fondo pl-10' : 'bg-superficie-tarjeta',
            'placeholder:text-texto-placeholder',
            'focus-visible:border-borde-foco',
            'disabled:cursor-not-allowed disabled:bg-superficie-sutil disabled:text-texto-secundario',
            error
              ? 'border-estado-error'
              : busqueda
                ? 'border-estado-info'
                : 'border-borde-control',
            accionInterna ? 'pr-11' : null,
            className,
          )}
        />
        {busqueda && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-estado-info"
          >
            <IconoLupa />
          </span>
        )}
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
