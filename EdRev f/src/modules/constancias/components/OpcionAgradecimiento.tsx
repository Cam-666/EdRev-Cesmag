/*
 * OpcionAgradecimiento — «Enviar también correo de agradecimiento» (marcada de entrada). Al estar marcada se dice qué
 * correo se enviará y, con «Ver o cambiar el correo», se ve y se puede escoger otra plantilla. Sin marcar, solo se envía
 * la constancia.
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
      <Casilla etiqueta="Enviar también correo de agradecimiento" marcada={marcada} onCambio={onCambio} />
      {marcada && <SelectorPlantillaCorreo estado={estado} alto="h-[35vh] min-h-[280px]" />}
    </div>
  )
}
