/*
 * BloquearParModal — blocks a peer by hand, choosing the reason (does not want to take part, or
 * did not answer). A blocked peer gets no new invitations. No Figma design for the dialog.
 * Covers: RF-15, HU-10. Administradora only (RNF-05).
 */
import { useState } from 'react'
import { MOTIVOS_BLOQUEO } from '../config/listas'
import { useBloquearPar } from '../hooks/useMutacionesPar'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import type { MotivoBloqueo } from '@/types/par'

export interface BloquearParModalProps {
  par: { id: string; nombre: string }
  abierto: boolean
  onCerrar: () => void
}

export function BloquearParModal({ par, abierto, onCerrar }: BloquearParModalProps) {
  const [motivo, setMotivo] = useState<MotivoBloqueo>('no-desea')
  const mutacion = useBloquearPar(par.id)

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Bloquear a ${par.nombre}`}
      descripcion="El par dejará de recibir nuevas invitaciones y aparecerá marcado en las búsquedas."
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            variante="peligro"
            cargando={mutacion.isPending}
            onClick={() => mutacion.mutate(motivo, { onSuccess: onCerrar })}
          >
            Bloquear
          </Boton>
        </>
      }
    >
      {mutacion.isError && (
        <Alerta tipo="error">No fue posible bloquear al par. Intente de nuevo.</Alerta>
      )}
      <ListaDesplegable
        etiqueta="Motivo del bloqueo"
        opciones={MOTIVOS_BLOQUEO}
        valor={motivo}
        onCambio={(v) => setMotivo(v as MotivoBloqueo)}
      />
    </Modal>
  )
}
