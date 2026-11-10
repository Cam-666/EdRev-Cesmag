/*
 * DetalleCorreoModal — read-only detail of a logged mail: type, recipient, subject, date and
 * result. Covers: RF-26, HU-20.
 */
import { ETIQUETA_TIPO_CORREO } from '../config/listas'
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
        correo ? `${ETIQUETA_TIPO_CORREO[correo.tipo]} · artículo ${correo.numeroOjs}` : ''
      }
      acciones={<Boton onClick={onCerrar}>Cerrar</Boton>}
    >
      {correo && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-cuerpo-15">
          <dt className="text-texto-secundario">Para</dt>
          <dd>{correo.destinatario}</dd>
          <dt className="text-texto-secundario">Asunto</dt>
          <dd>{correo.asunto}</dd>
          <dt className="text-texto-secundario">Fecha</dt>
          <dd>{formatearFechaHora(correo.fechaEnvio)}</dd>
          <dt className="text-texto-secundario">Resultado</dt>
          <dd>
            <DistintivoEstado estado={correo.estado} />
          </dd>
        </dl>
      )}
    </Modal>
  )
}
