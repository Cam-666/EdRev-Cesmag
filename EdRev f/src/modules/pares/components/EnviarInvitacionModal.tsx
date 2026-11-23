/*
 * EnviarInvitacionModal — la ventana que se abre al asignar un par: dice qué invitación se enviará (la que está en uso de
 * la revista) y, con «Ver o cambiar el correo», deja ver cómo la recibirá y escoger otra plantilla. «Enviar invitación»
 * registra la asignación y envía el correo.
 */
import { SelectorPlantillaCorreo } from '@/modules/correos/components/SelectorPlantillaCorreo'
import { useEleccionCorreo } from '@/modules/correos/hooks/useEleccionCorreo'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { Modal } from '@/components/common/Modal'
import { useRevista } from '@/lib/revista/useRevista'
import type { EleccionCorreo } from '@/types/plantilla'

export interface EnviarInvitacionModalProps {
  abierto: boolean
  nombrePar: string
  enviando: boolean
  error: string | null
  onEnviar: (eleccion: EleccionCorreo) => void
  onCerrar: () => void
}

/** Se monta solo mientras está abierta, así cada vez empieza con la plantilla en uso. */
export function EnviarInvitacionModal(props: EnviarInvitacionModalProps) {
  return props.abierto ? <Contenido {...props} /> : null
}

function Contenido({ nombrePar, enviando, error, onEnviar, onCerrar }: EnviarInvitacionModalProps) {
  const { revista } = useRevista()
  const estado = useEleccionCorreo(revista, 'invitacion')

  return (
    <Modal
      abierto
      ancho="amplio"
      onCerrar={onCerrar}
      titulo={`Invitar a ${nombrePar}`}
      descripcion="Al enviarla, el par queda asignado al artículo."
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={enviando}
            disabled={!estado.eleccion}
            onClick={() => estado.eleccion && onEnviar(estado.eleccion)}
          >
            Enviar invitación
          </Boton>
        </>
      }
    >
      {error && <Alerta tipo="error">{error}</Alerta>}
      <SelectorPlantillaCorreo estado={estado} />
    </Modal>
  )
}
