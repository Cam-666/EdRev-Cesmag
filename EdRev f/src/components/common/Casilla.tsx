/*
 * Casilla — checkbox on Radix Checkbox with a visible label tied by id.
 * Covers: RNF-11; "Mantener la sesión iniciada" (HU-28), data-treatment authorization (RNF-06).
 */
import * as Checkbox from '@radix-ui/react-checkbox'
import { useId } from 'react'

export interface CasillaProps {
  id?: string
  etiqueta: string
  marcada: boolean
  onCambio: (marcada: boolean) => void
  disabled?: boolean
}

export function Casilla({ id, etiqueta, marcada, onCambio, disabled }: CasillaProps) {
  const generado = useId()
  const idCampo = id ?? generado
  return (
    <div className="flex items-center gap-2">
      <Checkbox.Root
        id={idCampo}
        checked={marcada}
        disabled={disabled}
        onCheckedChange={(v) => onCambio(v === true)}
        className="flex h-5 w-5 items-center justify-center rounded-sm border border-borde-control bg-superficie-tarjeta disabled:cursor-not-allowed disabled:bg-superficie-sutil data-[state=checked]:border-cesmag-azul data-[state=checked]:bg-cesmag-azul"
      >
        <Checkbox.Indicator className="text-etiqueta-13 text-texto-inverso">
          <span aria-hidden="true">✓</span>
        </Checkbox.Indicator>
      </Checkbox.Root>
      <label htmlFor={idCampo} className="text-cuerpo-13 text-texto-principal">
        {etiqueta}
      </label>
    </div>
  )
}
