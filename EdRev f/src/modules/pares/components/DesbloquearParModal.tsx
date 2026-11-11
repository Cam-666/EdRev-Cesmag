/*
 * DesbloquearParModal — "Desbloquear a {par}": asks the reason and returns the peer to the list
 * of peers who can receive invitations. The change is recorded with user and date.
 * Covers: RF-16, HU-11. Both profiles (RNF-05).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { esquemaMotivo } from '../config/esquemas'
import type { MotivoForm } from '../config/esquemas'
import { useDesbloquearPar } from '../hooks/useMutacionesPar'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { Modal } from '@/components/common/Modal'

export interface DesbloquearParModalProps {
  par: { id: string; nombre: string } | null
  onCerrar: () => void
}

const FORMULARIO = 'formulario-desbloquear'

export function DesbloquearParModal({ par, onCerrar }: DesbloquearParModalProps) {
  const mutacion = useDesbloquearPar()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MotivoForm>({ resolver: zodResolver(esquemaMotivo), defaultValues: { motivo: '' } })

  function cerrar() {
    reset({ motivo: '' })
    onCerrar()
  }

  return (
    <Modal
      abierto={par !== null}
      onCerrar={cerrar}
      titulo={par ? `Desbloquear a ${par.nombre}` : 'Desbloquear par'}
      descripcion="El par volverá a recibir invitaciones. El cambio queda registrado con su usuario y fecha."
      acciones={
        <>
          <Boton variante="neutro" onClick={cerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
            Desbloquear
          </Boton>
        </>
      }
    >
      <form
        id={FORMULARIO}
        noValidate
        onSubmit={handleSubmit(({ motivo }) => {
          if (!par) return
          mutacion.mutate({ id: par.id, motivo }, { onSuccess: cerrar })
        })}
        className="flex flex-col gap-3"
      >
        {mutacion.isError && (
          <Alerta tipo="error">No fue posible desbloquear al par. Intente de nuevo.</Alerta>
        )}
        <AreaTexto
          etiqueta="Motivo"
          rows={3}
          error={errors.motivo?.message}
          {...register('motivo')}
        />
      </form>
    </Modal>
  )
}
