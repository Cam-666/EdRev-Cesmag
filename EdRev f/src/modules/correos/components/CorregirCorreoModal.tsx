/*
 * CorregirCorreoModal — "Corregir y reenviar": fixes the address of a mail that bounced (the
 * address belongs to the peer, so later sends use it too) and sends it again. The failed entry
 * becomes "Reintentado" and the new delivery is logged. Covers: RF-27, HU-18.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCorregirYReenviar } from '../hooks/useCorreos'
import type { CorreoConArticulo } from '../services/correosService'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'

const esquema = z.object({
  correo: z
    .string()
    .trim()
    .min(1, 'Escriba el correo electrónico.')
    .regex(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Escriba un correo válido, por ejemplo nombre@universidad.edu.co.',
    ),
})
type Datos = z.infer<typeof esquema>

export interface CorregirCorreoModalProps {
  correo: CorreoConArticulo | null
  onCerrar: () => void
  onReenviado: (mensaje: string) => void
}

const FORMULARIO = 'formulario-corregir-correo'

export function CorregirCorreoModal({ correo, onCerrar, onReenviado }: CorregirCorreoModalProps) {
  return correo ? <Contenido correo={correo} onCerrar={onCerrar} onReenviado={onReenviado} /> : null
}

/** Mounted only while open so each opening starts from the failed address, not a previous edit. */
function Contenido({
  correo,
  onCerrar,
  onReenviado,
}: {
  correo: CorreoConArticulo
  onCerrar: () => void
  onReenviado: (mensaje: string) => void
}) {
  const mutacion = useCorregirYReenviar()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { correo: correo.destinatario },
  })

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Corregir y reenviar"
      descripcion={`La dirección ${correo.destinatario} rebotó (artículo ${correo.numeroOjs}).`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
            Corregir y reenviar
          </Boton>
        </>
      }
    >
      <form
        id={FORMULARIO}
        noValidate
        onSubmit={handleSubmit((v) =>
          mutacion.mutate(
            { correoId: correo.id, correo: v.correo },
            {
              onSuccess: () => {
                onReenviado(`Correo corregido y reenviado a ${v.correo}.`)
                onCerrar()
              },
            },
          ),
        )}
        className="flex flex-col gap-3"
      >
        {mutacion.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(mutacion.error, 'No fue posible reenviar el correo.')}
          </Alerta>
        )}
        <CampoTexto
          etiqueta="Correo del par"
          type="email"
          autoComplete="off"
          error={errors.correo?.message}
          {...register('correo')}
        />
      </form>
    </Modal>
  )
}
