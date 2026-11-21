/*
 * EnviarInvitacionModal — la ventana que se abre al asignar un par: muestra la invitación tal como la recibirá,
 * deja escoger otra plantilla de invitación de la revista (sale elegida la habitual) y cambiar su texto solo para
 * este envío. «Asignar y enviar invitación» registra la asignación y envía el correo con lo que se ve.
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

/** Se monta solo mientras está abierta, así cada vez empieza con la plantilla habitual y sin cambios. */
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
      descripcion="Revise la invitación. Si todo está bien, pulse «Asignar y enviar invitación»."
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
            Asignar y enviar invitación
          </Boton>
        </>
      }
    >
      {error && <Alerta tipo="error">{error}</Alerta>}
      <SelectorPlantillaCorreo estado={estado} nombre="la invitación" />
    </Modal>
  )
}
