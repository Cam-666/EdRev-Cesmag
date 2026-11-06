/*
 * ReenvioEnlace — "Reenviar el enlace (disponible en 00:45)": resend is locked for a countdown.
 * The countdown is not a live region (it would be announced every second); the result is.
 * Covers: RNF-11. No RF/HU yet (pending to incorporate).
 */
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { useCuentaRegresiva } from '../hooks/useCuentaRegresiva'
import { useSolicitarRecuperacion } from '../hooks/useSolicitarRecuperacion'
import { Boton } from '@/components/common/Boton'
import { formatearCuenta } from '@/lib/format'

export interface ReenvioEnlaceProps {
  correo: string
}

export function ReenvioEnlace({ correo }: ReenvioEnlaceProps) {
  const mutacion = useSolicitarRecuperacion()
  const cuenta = useCuentaRegresiva(POLITICA_ACCESO.reenvioSegundos)
  const esperando = cuenta.segundos > 0

  function reenviar() {
    mutacion.mutate(correo, { onSuccess: () => cuenta.reiniciar(POLITICA_ACCESO.reenvioSegundos) })
  }

  return (
    <div className="flex flex-col gap-2">
      <Boton
        variante="secundario"
        className="w-full"
        disabled={esperando}
        cargando={mutacion.isPending}
        onClick={reenviar}
      >
        {esperando
          ? `Reenviar el enlace (disponible en ${formatearCuenta(cuenta.segundos)})`
          : 'Reenviar el enlace'}
      </Boton>
      <p role="status" className="text-center text-cuerpo-13 text-estado-exito">
        {mutacion.isSuccess ? 'Enlace reenviado.' : ''}
      </p>
      {mutacion.isError && (
        <p role="alert" className="text-center text-cuerpo-13 text-estado-error">
          No fue posible reenviar el enlace. Intente de nuevo.
        </p>
      )}
    </div>
  )
}
