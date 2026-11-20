/*
 * RespuestaParModal — registra cómo respondió el par a la invitación: aceptó, no aceptó esta invitación (no se
 * bloquea), no desea participar más (se bloquea) o sin respuesta tras el 2.º intento (se bloquea). El diálogo
 * avisa cuándo se bloqueará al par. No tiene diseño en Figma. El artículo pasa a «En evaluación» cuando acepta el
 * primer par. Para ambos perfiles.
 */
import { useState } from 'react'
import { useRegistrarRespuesta } from '../hooks/useAsignaciones'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { AsignacionDetalle, RespuestaPar } from '@/types/par'

export interface RespuestaParModalProps {
  asignacion: AsignacionDetalle
  abierto: boolean
  onCerrar: () => void
  onRegistrada: (mensaje: string) => void
}

export function RespuestaParModal({
  asignacion,
  abierto,
  onCerrar,
  onRegistrada,
}: RespuestaParModalProps) {
  const [respuesta, setRespuesta] = useState<RespuestaPar>('acepto')
  const mutacion = useRegistrarRespuesta()
  const segundoIntento = asignacion.estado === 'segundo-intento'

  const opciones = [
    { valor: 'acepto', etiqueta: 'Aceptó la invitación' },
    { valor: 'no-acepto', etiqueta: 'No aceptó esta invitación' },
    { valor: 'no-desea', etiqueta: 'No desea participar más' },
    ...(segundoIntento
      ? [{ valor: 'sin-respuesta', etiqueta: 'No respondió tras el 2.º intento' }]
      : []),
  ]

  function confirmar() {
    mutacion.mutate(
      { asignacionId: asignacion.id, respuesta },
      {
        onSuccess: () => {
          onRegistrada(
            respuesta === 'acepto'
              ? `${asignacion.par.nombre} aceptó la invitación.`
              : respuesta === 'no-acepto'
                ? `${asignacion.par.nombre} no aceptó esta invitación.`
                : `${asignacion.par.nombre} pasó a la lista de bloqueados.`,
          )
          onCerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Respuesta del par"
      descripcion={`${asignacion.par.nombre} · par ${asignacion.orden}`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton cargando={mutacion.isPending} onClick={confirmar}>
            Registrar respuesta
          </Boton>
        </>
      }
    >
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible registrar la respuesta.')}
        </Alerta>
      )}
      <ListaDesplegable
        etiqueta="Respuesta del par"
        opciones={opciones}
        valor={respuesta}
        onCambio={(v) => setRespuesta(v as RespuestaPar)}
      />
      {(respuesta === 'no-desea' || respuesta === 'sin-respuesta') && (
        <Alerta tipo="advertencia">
          El par pasará a la lista de bloqueados y no recibirá nuevas invitaciones.
        </Alerta>
      )}
    </Modal>
  )
}
