/*
 * ConfiguracionPage — Configuración (/administracion/configuracion): the days a peer has to answer
 * an invitation. After that time the system sends the 2nd attempt by itself and, if it is not
 * answered either, blocks the peer. Administradora only. Covers: RF-29, RF-15, RNF-05, RNF-18.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useConfiguracion, useGuardarConfiguracion } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { mensajeDeApi } from '@/lib/api/errores'

const esquema = z.object({
  diasEspera: z
    .number({ error: 'Escriba un número de días.' })
    .int('Escriba un número entero de días.')
    .min(1, 'Mínimo 1 día.')
    .max(60, 'Máximo 60 días.'),
})
type Datos = z.infer<typeof esquema>

export function ConfiguracionPage() {
  const consulta = useConfiguracion()
  const guardar = useGuardarConfiguracion()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { diasEspera: 5 } })

  useEffect(() => {
    if (consulta.data) reset({ diasEspera: consulta.data.diasEspera })
  }, [consulta.data, reset])

  const enviar = handleSubmit((datos) => {
    guardar.mutate(datos, { onSuccess: (r) => reset({ diasEspera: r.diasEspera }) })
  })

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-configuracion">
      <EncabezadoPagina nivel="h2" titulo={<span id="titulo-configuracion">Configuración</span>} />
      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="la configuración"
      >
        <form onSubmit={(e) => void enviar(e)} className="flex max-w-sm flex-col gap-4" noValidate>
          <CampoTexto
            etiqueta="Días de espera de la respuesta del par"
            ayuda="Pasado este plazo se envía el segundo intento y, si tampoco responde, se bloquea."
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            error={errors.diasEspera?.message}
            {...register('diasEspera', { valueAsNumber: true })}
          />
          <div role="status" aria-live="polite">
            {guardar.isSuccess && !isDirty && <Alerta tipo="exito">Configuración guardada.</Alerta>}
            {guardar.isError && (
              <Alerta tipo="error">
                {mensajeDeApi(guardar.error, 'No fue posible guardar la configuración.')}
              </Alerta>
            )}
          </div>
          <div>
            <Boton type="submit" cargando={guardar.isPending} disabled={!isDirty}>
              Guardar
            </Boton>
          </div>
        </form>
      </EstadoConsulta>
    </section>
  )
}
