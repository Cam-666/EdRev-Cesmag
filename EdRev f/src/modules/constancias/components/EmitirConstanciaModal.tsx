/*
 * EmitirConstanciaModal — issues the constancia of a peer from the article sheet, right after the
 * delivery is registered or later from the peer's actions. It shows the constancia as it will be
 * generated (the journal's constancia template over its PDF background) and «Emitir y enviar»
 * sends it to the peer. The option «Emitir con correo de agradecimiento» (marked by default) makes
 * the mail carry the journal's thank-you text; unmarked, only the constancia is sent.
 * «Más tarde» leaves it pending in Constancias.
 * Covers: RF-23, RF-30, RF-31, HU-17 (criterion 3), HU-22 (criterion 4).
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
  /** Line under the title, e.g. "Entrega registrada." right after marking the delivery. */
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
