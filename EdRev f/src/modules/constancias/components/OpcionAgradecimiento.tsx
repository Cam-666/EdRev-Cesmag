/*
 * OpcionAgradecimiento — «Emitir con correo de agradecimiento» (marcada de entrada). Al estar marcada se muestra el
 * correo de agradecimiento que acompaña a la constancia: se puede escoger otra plantilla de la revista y cambiar su
 * texto solo para este envío. Sin marcar, solo se envía la constancia.
 */
import { SelectorPlantillaCorreo } from '@/modules/correos/components/SelectorPlantillaCorreo'
import type { EleccionDeCorreo } from '@/modules/correos/hooks/useEleccionCorreo'
import { Casilla } from '@/components/common/Casilla'

export interface OpcionAgradecimientoProps {
  marcada: boolean
  onCambio: (marcada: boolean) => void
  estado: EleccionDeCorreo
}

export function OpcionAgradecimiento({ marcada, onCambio, estado }: OpcionAgradecimientoProps) {
  return (
    <div className="flex flex-col gap-3">
      <Casilla etiqueta="Emitir con correo de agradecimiento" marcada={marcada} onCambio={onCambio} />
      {marcada && <SelectorPlantillaCorreo estado={estado} nombre="el agradecimiento" alto="h-[35vh] min-h-[280px]" />}
    </div>
  )
}
