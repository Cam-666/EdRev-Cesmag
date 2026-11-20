/*
 * ConfiguracionPage — Configuración (/administracion/configuracion), en dos pestañas:
 * - Correos: los días que tiene un par para responder una invitación (pasado ese tiempo el sistema envía solo el
 *   2.º intento y, si tampoco se responde, bloquea al par) y, de cada revista, qué plantilla es la invitación y
 *   cuál el correo de agradecimiento.
 * - Constancias: de cada revista, qué plantilla es su constancia y su ISSN e indexaciones, que van en la constancia.
 * Solo para la Administradora.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DatosRevistaForm } from '../components/DatosRevistaForm'
import { ElegirPlantillaDeUso } from '../components/ElegirPlantillaDeUso'
import { useConfiguracion, useGuardarConfiguracion, usePlantillas } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Pestanas } from '@/components/common/Pestanas'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

const esquema = z.object({
  diasEspera: z
    .number({ error: 'Escriba un número de días.' })
    .int('Escriba un número entero de días.')
    .min(1, 'Mínimo 1 día.')
    .max(60, 'Máximo 60 días.'),
})
type Datos = z.infer<typeof esquema>

const REVISTAS_IDS = Object.keys(REVISTAS) as Revista[]

function DiasDeEspera({ diasEspera }: { diasEspera: number }) {
  const guardar = useGuardarConfiguracion()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { diasEspera } })

  useEffect(() => reset({ diasEspera }), [diasEspera, reset])

  const enviar = handleSubmit((datos) => {
    guardar.mutate(datos, { onSuccess: (r) => reset({ diasEspera: r.diasEspera }) })
  })

  return (
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
  )
}

function PestanaCorreos({ diasEspera, plantillas }: { diasEspera: number; plantillas: Plantilla[] }) {
  return (
    <div className="flex flex-col gap-6">
      <DiasDeEspera diasEspera={diasEspera} />
      <section aria-labelledby="titulo-correos-uso" className="flex flex-col gap-3">
        <h3 id="titulo-correos-uso" className="text-titulo-16">
          Plantillas de los correos
        </h3>
        <p className="max-w-2xl text-cuerpo-13 text-texto-secundario">
          Elija, para cada revista, la plantilla que se usará en la invitación a evaluar y en el
          correo de agradecimiento. Las plantillas se crean y se editan en Plantillas.
        </p>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {REVISTAS_IDS.map((r) => (
            <div
              key={r}
              className="flex flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4"
            >
              <h4 className="text-titulo-16">{REVISTAS[r].nombreCorto}</h4>
              <ElegirPlantillaDeUso revista={r} uso="invitacion" plantillas={plantillas} />
              <ElegirPlantillaDeUso revista={r} uso="agradecimiento" plantillas={plantillas} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ConfiguracionPage() {
  const consulta = useConfiguracion()
  const plantillas = usePlantillas()
  const configuracion = consulta.data
  const lista = plantillas.data?.plantillas

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-configuracion">
      <EncabezadoPagina nivel="h2" titulo={<span id="titulo-configuracion">Configuración</span>} />
      <EstadoConsulta
        cargando={consulta.isPending || plantillas.isPending}
        error={consulta.isError || plantillas.isError}
        onReintentar={() => {
          void consulta.refetch()
          void plantillas.refetch()
        }}
        descripcion="la configuración"
      >
        {configuracion && lista && (
          <Pestanas
            etiqueta="Secciones de la configuración"
            pestanas={[
              {
                valor: 'correos',
                etiqueta: 'Correos',
                contenido: (
                  <PestanaCorreos diasEspera={configuracion.diasEspera} plantillas={lista} />
                ),
              },
              {
                valor: 'constancias',
                etiqueta: 'Constancias',
                contenido: (
                  <div className="flex flex-col gap-4">
                    <p className="max-w-2xl text-cuerpo-13 text-texto-secundario">
                      Elija la plantilla de la constancia de cada revista y registre su ISSN y sus
                      indexaciones, que cambian con el tiempo. Al editarlos, las constancias que se
                      envíen o se descarguen desde ese momento salen con el texto nuevo.
                    </p>
                    {REVISTAS_IDS.map((r) => (
                      <div key={r} className="flex max-w-2xl flex-col gap-3">
                        <ElegirPlantillaDeUso revista={r} uso="constancia" plantillas={lista} />
                        <DatosRevistaForm revista={r} datos={configuracion.revistas[r]} />
                      </div>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        )}
      </EstadoConsulta>
    </section>
  )
}
