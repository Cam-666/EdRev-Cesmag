/*
 * EmitirConstanciaModal — emite la constancia de un par desde la ficha del artículo, justo después de registrar
 * la entrega o más tarde desde las acciones del par. Muestra la constancia como se va a generar (la plantilla de
 * constancia de la revista con sus imágenes) y «Emitir y enviar» se la envía al par. La opción «Emitir con
 * correo de agradecimiento» (marcada por defecto) hace que el correo lleve el texto de agradecimiento de la
 * revista; sin marcar, solo se envía la constancia. «Más tarde» la deja pendiente en Constancias.
 */
import { useState } from 'react'
import { OpcionAgradecimiento } from './OpcionAgradecimiento'
import { VistaPdfConstancia } from './VistaPdfConstancia'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { useEmitirConstancia, useVistaConstancia } from '../hooks/useConstancias'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { useRevista } from '@/lib/revista/useRevista'
import { useEleccionCorreo } from '@/modules/correos/hooks/useEleccionCorreo'

export interface EmitirConstanciaModalProps {
  constanciaId: string | null
  nombrePar: string
  /** Línea bajo el título, por ejemplo «Entrega registrada.» justo después de marcar la entrega. */
  aviso?: string
  onCerrar: () => void
  onEmitida: (mensaje: string) => void
}

/** Se monta solo mientras está abierta, así cada vez empieza con el agradecimiento habitual y sin cambios. */
export function EmitirConstanciaModal(props: EmitirConstanciaModalProps) {
  return props.constanciaId !== null ? <Contenido {...props} /> : null
}

function Contenido({
  constanciaId,
  nombrePar,
  aviso,
  onCerrar,
  onEmitida,
}: EmitirConstanciaModalProps) {
  const vista = useVistaConstancia(constanciaId)
  const emitir = useEmitirConstancia()
  const [conAgradecimiento, setConAgradecimiento] = useState(true)
  const { revista } = useRevista()
  const gracias = useEleccionCorreo(revista, 'agradecimiento')

  function confirmar() {
    if (!constanciaId) return
    emitir.mutate(
      {
        constanciaId,
        conAgradecimiento,
        eleccion: conAgradecimiento ? gracias.eleccion : undefined,
      },
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
      ancho="amplio"
      abierto
      onCerrar={onCerrar}
      titulo={`Emitir la constancia de ${nombrePar}`}
      descripcion={aviso ?? 'La constancia se enviará por correo al par evaluador.'}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Más tarde
          </Boton>
          <Boton
            cargando={emitir.isPending}
            disabled={!vista.data || (conAgradecimiento && !gracias.eleccion)}
            onClick={confirmar}
          >
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
        {/* Con el servidor real se ve el PDF que recibirá el par, en grande; con los datos de ejemplo, la vista de texto. */}
        {vista.data &&
          (import.meta.env.VITE_USE_MOCKS === 'false' ? (
            <VistaPdfConstancia constanciaId={constanciaId} />
          ) : (
            <VistaPreviaConstancia vista={vista.data} />
          ))}
      </EstadoConsulta>
      <OpcionAgradecimiento
        marcada={conAgradecimiento}
        onCambio={setConAgradecimiento}
        estado={gracias}
      />
    </Modal>
  )
}
