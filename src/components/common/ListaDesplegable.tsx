/*
 * ListaDesplegable — select built on Radix Select (keyboard + ARIA handled by the primitive).
 * Covers: RNF-11; used by RF-01 (article type), RF-06 (committee result), RF-20 (par concept).
 */
import * as Select from '@radix-ui/react-select'
import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface OpcionLista {
  valor: string
  etiqueta: string
}

export interface ListaDesplegableProps {
  id?: string
  etiqueta: string
  opciones: OpcionLista[]
  valor?: string
  onCambio?: (valor: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

export function ListaDesplegable({
  id,
  etiqueta,
  opciones,
  valor,
  onCambio,
  placeholder = 'Seleccione…',
  error,
  disabled,
  className,
}: ListaDesplegableProps) {
  const generado = useId()
  const idCampo = id ?? generado
  const idError = `${idCampo}-error`

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={idCampo} className="text-etiqueta-13 text-texto-principal">
        {etiqueta}
      </label>
      <Select.Root value={valor} onValueChange={onCambio} disabled={disabled}>
        <Select.Trigger
          id={idCampo}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={cn(
            'flex min-h-control items-center justify-between gap-2 rounded-md border bg-superficie-tarjeta px-3 text-cuerpo-15 text-texto-principal',
            'data-[placeholder]:text-texto-placeholder',
            'disabled:cursor-not-allowed disabled:bg-superficie-sutil disabled:text-texto-secundario',
            error ? 'border-estado-error' : 'border-borde-control',
          )}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon aria-hidden="true">▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-borde-fuerte bg-superficie-tarjeta shadow-elevada"
          >
            <Select.Viewport className="p-1">
              {opciones.map((o) => (
                <Select.Item
                  key={o.valor}
                  value={o.valor}
                  className="flex min-h-control-sm cursor-pointer items-center gap-2 rounded-sm px-3 text-cuerpo-15 text-texto-principal data-[highlighted]:bg-estado-info-fondo data-[highlighted]:outline-none"
                >
                  <Select.ItemIndicator aria-hidden="true">✓</Select.ItemIndicator>
                  <Select.ItemText>{o.etiqueta}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {error && (
        <p id={idError} role="alert" className="flex gap-1 text-cuerpo-13 text-estado-error">
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
