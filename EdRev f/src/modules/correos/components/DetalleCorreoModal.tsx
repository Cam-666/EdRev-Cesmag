/*
 * DetalleCorreoModal — detalle de solo lectura de un correo registrado: tipo, destinatario, asunto, fecha y
 * resultado; para una invitación, también la respuesta del par y cómo se dio (un botón del correo o la registró
 * un usuario).
 */
import { ETIQUETA_DIRIGIDO_A, ETIQUETA_RESPUESTA_PAR, ETIQUETA_TIPO_CORREO } from '../config/listas'
import type { CorreoConArticulo } from '../services/correosService'
import { Boton } from '@/components/common/Boton'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Modal } from '@/components/common/Modal'
import { formatearFechaHora } from '@/lib/format'

export interface DetalleCorreoModalProps {
  correo: CorreoConArticulo | null
  onCerrar: () => void
}

export function DetalleCorreoModal({ correo, onCerrar }: DetalleCorreoModalProps) {
  return (
    <Modal
      abierto={correo !== null}
      onCerrar={onCerrar}
      titulo="Detalle del correo"
      descripcion={
        correo
          ? correo.tipo === 'mensaje'
            ? ETIQUETA_TIPO_CORREO[correo.tipo]
            : `${ETIQUETA_TIPO_CORREO[correo.tipo]} · artículo ${correo.numeroOjs}`
          : ""
      }
      acciones={<Boton onClick={onCerrar}>Cerrar</Boton>}
    >
      {correo && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-cuerpo-15">
          <dt className="text-texto-secundario">Para</dt>
          <dd>
            {correo.nombreDestinatario ? (
              <>
                {correo.nombreDestinatario}
                <span className="block text-cuerpo-13 text-texto-secundario">{correo.destinatario}</span>
              </>
            ) : (
              correo.destinatario
            )}
          </dd>
          <dt className="text-texto-secundario">Dirigido a</dt>
          <dd>{ETIQUETA_DIRIGIDO_A[correo.dirigidoA ?? 'par']}</dd>
          <dt className="text-texto-secundario">Asunto</dt>
          <dd>{correo.asunto}</dd>
          <dt className="text-texto-secundario">Fecha</dt>
          <dd>{formatearFechaHora(correo.fechaEnvio)}</dd>
          <dt className="text-texto-secundario">Resultado</dt>
          <dd>
            <DistintivoEstado estado={correo.estado} />
          </dd>
          {correo.respuestaPar && (
            <>
              <dt className="text-texto-secundario">Respuesta del par</dt>
              <dd>
                {ETIQUETA_RESPUESTA_PAR[correo.respuestaPar.respuesta]}
                {correo.respuestaPar.fecha && (
                  <span className="block text-cuerpo-13 text-texto-secundario">
                    {formatearFechaHora(correo.respuestaPar.fecha)}
                    {correo.respuestaPar.medio === 'correo' && ' · desde el botón del correo'}
                    {correo.respuestaPar.medio === 'manual' && ' · registrada por un usuario'}
                  </span>
                )}
              </dd>
            </>
          )}
        </dl>
      )}
    </Modal>
  )
}
