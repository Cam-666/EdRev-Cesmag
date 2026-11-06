/*
 * Buscador — search box with a programmatic label (visually hidden; the placeholder is the hint).
 * Covers: RF-10 (author search), RF-14 (par search), RF-35 (article list), RNF-11.
 */
import { useId } from 'react'
import type { ComponentPropsWithRef } from 'react'
import { cn } from '@/lib/cn'

export interface BuscadorProps extends Omit<ComponentPropsWithRef<'input'>, 'id' | 'type'> {
  id?: string
  etiqueta: string
}

export function Buscador({ id, etiqueta, className, ...resto }: BuscadorProps) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <div role="search" className={cn('relative', className)}>
      <label htmlFor={idCampo} className="sr-only">
        {etiqueta}
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario"
      >
        ⌕
      </span>
      <input
        {...resto}
        id={idCampo}
        type="search"
        className="min-h-control w-full rounded-md border border-borde-control bg-superficie-tarjeta pl-8 pr-3 text-cuerpo-15 text-texto-principal placeholder:text-texto-placeholder"
      />
    </div>
  )
}
