/*
 * EmitirConstanciaModal — emite la constancia de un par desde la ficha del artículo, justo después de registrar
 * la entrega o más tarde desde las acciones del par. Muestra la constancia como se va a generar (la plantilla de
 * constancia de la revista con sus imágenes) y «Emitir y enviar» se la envía al par. La opción «Emitir con
 * correo de agradecimiento» (marcada por defecto) hace que el correo lleve el texto de agradecimiento de la
 * revista; sin marcar, solo se envía la constancia. «Más tarde» la deja pendiente en Constancias.
 */
import { useState } from 'react'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { useEmitirConstancia, useVistaConstancia } from '../hooks/useConstancias'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { Casilla } from '@/components/common/Casilla'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'

export interface EmitirConstanciaModalProps {
  constanciaId: string | null
  nombrePar: string
  /** Línea bajo el título, por ejemplo «Entrega registrada.» justo después de marcar la entrega. */
  aviso?: string
  onCerrar: () => void
  onEmitida: (mensaje: string) => void
}

export function EmitirConstanciaModal({
  constanciaId,
  nombrePar,
  aviso,
  onCerrar,
  onEmitida,
}: EmitirConstanciaModalProps) {
  const vista = useVistaConstancia(constanciaId)
  const emitir = useEmitirConstancia()
  const [conAgradecimiento, setConAgradecimiento] = useState(true)

  function confirmar() {
    if (!constanciaId) return
    emitir.mutate(
      { constanciaId, conAgradecimiento },
      {
        onSuccess: ({ correo }) => {
          onEmitida(
            correo.estado === 'rebotado'
              ? `La constancia se emitió, pero la dirección ${correo.destinatario} rebotó.`
              : `Constancia enviada a ${nombrePar}.`,
          )
          onCerrar()
        },
      },
    )
  }

  return (
    <Modal
      abierto={constanciaId !== null}
      onCerrar={onCerrar}
      titulo={`Emitir la constancia de ${nombrePar}`}
      descripcion={aviso ?? 'La constancia se enviará por correo al par evaluador.'}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Más tarde
          </Boton>
          <Boton cargando={emitir.isPending} disabled={!vista.data} onClick={confirmar}>
            Emitir y enviar
          </Boton>
        </>
      }
    >
      {emitir.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(emitir.error, 'No fue posible emitir la constancia.')}
        </Alerta>
      )}
      <EstadoConsulta
        cargando={vista.isPending}
        error={vista.isError}
        onReintentar={() => void vista.refetch()}
        descripcion="la constancia"
      >
        {vista.data && <VistaPreviaConstancia vista={vista.data} />}
      </EstadoConsulta>
      <Casilla
        etiqueta="Emitir con correo de agradecimiento"
        marcada={conAgradecimiento}
        onCambio={setConAgradecimiento}
      />
    </Modal>
  )
}
