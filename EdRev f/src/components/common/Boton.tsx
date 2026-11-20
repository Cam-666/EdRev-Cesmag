/*
 * Boton — botón base, con foco visible y manejo por teclado. Siempre en azul o rojo institucional, nunca en el
 * color de la revista.
 */
import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

export type VarianteBoton = 'primario' | 'secundario' | 'neutro' | 'texto' | 'peligro'
export type TamanoBoton = 'md' | 'sm'

export interface BotonProps extends ComponentPropsWithRef<'button'> {
  variante?: VarianteBoton
  tamano?: TamanoBoton
  cargando?: boolean
}

const VARIANTES: Record<VarianteBoton, string> = {
  primario:
    'bg-cesmag-azul text-texto-inverso hover:bg-cesmag-azul-panel active:bg-cesmag-azul-oscuro',
  secundario:
    'border border-cesmag-azul bg-superficie-tarjeta text-cesmag-azul hover:bg-estado-info-fondo active:bg-estado-info-fondo',
  neutro:
    'border border-borde-control bg-superficie-tarjeta text-texto-principal hover:bg-superficie-sutil active:bg-neutro-200',
  texto: 'text-texto-enlace hover:bg-estado-info-fondo active:bg-estado-info-fondo',
  peligro: 'bg-cesmag-rojo text-texto-inverso hover:brightness-90 active:brightness-75',
}

const TAMANOS: Record<TamanoBoton, string> = {
  md: 'min-h-control px-4 text-cuerpo-15-enfasis',
  sm: 'min-h-control-sm px-3 text-etiqueta-13',
}

/** Clases de un botón; las comparten <Boton> y <EnlaceBoton> para que se vean idénticos. */
export function clasesBoton(
  variante: VarianteBoton = 'primario',
  tamano: TamanoBoton = 'md',
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md transition-colors',
    TAMANOS[tamano],
    VARIANTES[variante],
    'disabled:cursor-not-allowed disabled:border-transparent disabled:bg-neutro-200 disabled:text-texto-secundario',
  )
}

export function Boton({
  variante = 'primario',
  tamano = 'md',
  cargando = false,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: BotonProps) {
  const inactivo = disabled || cargando
  return (
    <button
      {...resto}
      type={type}
      disabled={inactivo}
      aria-busy={cargando || undefined}
      className={cn(clasesBoton(variante, tamano), className)}
    >
      {cargando && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 animate-spin"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <circle cx="12" cy="12" r="9" opacity="0.3" />
          <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
        </svg>
      )}
      {children}
      {cargando && <span className="sr-only">Cargando…</span>}
    </button>
  )
}
