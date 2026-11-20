/*
 * DatosRevistaForm — el ISSN y las indexaciones de una revista. Van en su constancia ({{issn}} y
 * {{indexaciones}}), que se genera de nuevo cada vez, así un cambio aquí se ve en toda constancia enviada o
 * descargada desde ese momento.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useGuardarDatosRevista } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { mensajeDeApi } from '@/lib/api/errores'
import type { DatosRevista } from '@/types/configuracion'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const esquema = z.object({
  issn: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{3}[\dXx])?$/, 'El ISSN tiene la forma 1234-567X.'),
  indexaciones: z.string().trim().max(1500, 'Máximo 1500 caracteres.'),
})

export interface DatosRevistaFormProps {
  revista: Revista
  datos: DatosRevista
}

export function DatosRevistaForm({ revista, datos }: DatosRevistaFormProps) {
  const guardar = useGuardarDatosRevista()
  const nombre = REVISTAS[revista].nombreCorto
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<DatosRevista>({ resolver: zodResolver(esquema), defaultValues: datos })

  useEffect(() => reset(datos), [datos, reset])

  const enviar = handleSubmit((valores) => {
    guardar.mutate({ revista, datos: valores }, { onSuccess: (r) => reset(r) })
  })

  return (
    <form
      onSubmit={(e) => void enviar(e)}
      noValidate
      aria-label={`Datos de ${nombre}`}
      className="flex max-w-2xl flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
    >
      <h3 className="text-titulo-16">{nombre}</h3>
      <CampoTexto
        etiqueta={`ISSN de ${nombre}`}
        ayuda="Se incluye en la constancia mediante el marcador {{issn}}."
        autoComplete="off"
        error={errors.issn?.message}
        {...register('issn')}
      />
      <AreaTexto
        etiqueta={`Indexaciones de ${nombre}`}
        ayuda="Escríbalas tal como deben leerse en la constancia, separadas por comas (por ejemplo: Publindex (categoría B), Redalyc y DOAJ). Se incluyen mediante el marcador {{indexaciones}}."
        rows={4}
        error={errors.indexaciones?.message}
        {...register('indexaciones')}
      />
      <div role="status" aria-live="polite">
        {guardar.isSuccess && !isDirty && (
          <Alerta tipo="exito">Datos guardados. Las constancias nuevas los usarán.</Alerta>
        )}
        {guardar.isError && (
          <Alerta tipo="error">{mensajeDeApi(guardar.error, 'No fue posible guardar los datos.')}</Alerta>
        )}
      </div>
      <div>
        <Boton type="submit" cargando={guardar.isPending} disabled={!isDirty}>
          {`Guardar datos de ${nombre}`}
        </Boton>
      </div>
    </form>
  )
}
