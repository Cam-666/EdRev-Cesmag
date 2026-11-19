/*
 * FirmaDeLosCorreos — who signs the mails of one journal: the name and the position that close every
 * mail (invitation, thank-you and the one that carries the constancia), so the peer knows who is in
 * charge. It is text, so it shows in every mail client. While no name is written, the Administradora
 * of the dependency signs. Covers: RF-25, RF-31, RF-45.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useGuardarFirmaRevista } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { mensajeDeApi } from '@/lib/api/errores'
import type { FirmaRevista } from '@/types/configuracion'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const esquema = z.object({
  firmaNombre: z.string().trim().max(150, 'Máximo 150 caracteres.'),
  firmaCargo: z.string().trim().max(150, 'Máximo 150 caracteres.'),
})

export interface FirmaDeLosCorreosProps {
  revista: Revista
  datos: FirmaRevista
}

export function FirmaDeLosCorreos({ revista, datos }: FirmaDeLosCorreosProps) {
  const guardar = useGuardarFirmaRevista()
  const nombre = REVISTAS[revista].nombreCorto
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FirmaRevista>({
    resolver: zodResolver(esquema),
    defaultValues: { firmaNombre: datos.firmaNombre, firmaCargo: datos.firmaCargo },
  })

  useEffect(() => reset({ firmaNombre: datos.firmaNombre, firmaCargo: datos.firmaCargo }), [datos, reset])

  const enviar = handleSubmit((valores) => {
    guardar.mutate(
      { revista, datos: valores },
      { onSuccess: (r) => reset({ firmaNombre: r.firmaNombre, firmaCargo: r.firmaCargo }) },
    )
  })

  return (
    <form
      onSubmit={(e) => void enviar(e)}
      noValidate
      aria-label={`Firma de los correos de ${nombre}`}
      className="flex flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
    >
      <h4 className="text-titulo-16">{nombre}</h4>
      <CampoTexto
        etiqueta="Nombre de quien firma"
        ayuda="Si lo deja vacío, firma la Administradora de la dependencia."
        autoComplete="off"
        error={errors.firmaNombre?.message}
        {...register('firmaNombre')}
      />
      <CampoTexto
        etiqueta="Cargo"
        ayuda="Aparece bajo el nombre, por ejemplo: Editora de la revista."
        autoComplete="off"
        error={errors.firmaCargo?.message}
        {...register('firmaCargo')}
      />
      <div role="status" aria-live="polite">
        {guardar.isSuccess && !isDirty && <Alerta tipo="exito">Firma guardada.</Alerta>}
        {guardar.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(guardar.error, 'No fue posible guardar la firma.')}
          </Alerta>
        )}
      </div>
      <div>
        <Boton type="submit" cargando={guardar.isPending} disabled={!isDirty}>
          Guardar firma
        </Boton>
      </div>
    </form>
  )
}
