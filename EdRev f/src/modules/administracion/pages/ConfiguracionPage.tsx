/*
 * ConfiguracionPage — Configuración (/administracion/configuracion), en una sola página con dos partes:
 * - Respuesta de los pares: los días que tiene un par para responder una invitación (pasado ese tiempo el sistema
 *   envía solo el 2.º intento y, si tampoco se responde, bloquea al par).
 * - Constancias: de cada revista, su ISSN y sus indexaciones, que van en la constancia.
 * Qué plantilla se usa para cada correo ya no se elige aquí: se marca desde la propia plantilla, en Plantillas.
 * Solo para la Administradora.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DatosRevistaForm } from '../components/DatosRevistaForm'
import { useConfiguracion, useGuardarConfiguracion } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
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

export function ConfiguracionPage() {
  const consulta = useConfiguracion()
  const configuracion = consulta.data

  return (
    <section className="flex flex-col gap-6" aria-labelledby="titulo-configuracion">
      <EncabezadoPagina nivel="h2" titulo={<span id="titulo-configuracion">Configuración</span>} />
      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="la configuración"
      >
        {configuracion && (
          <>
            <section aria-labelledby="titulo-respuesta-pares" className="flex flex-col gap-3">
              <h3 id="titulo-respuesta-pares" className="text-titulo-16">
                Respuesta de los pares
              </h3>
              <DiasDeEspera diasEspera={configuracion.diasEspera} />
            </section>
            <section aria-labelledby="titulo-datos-constancia" className="flex flex-col gap-3">
              <h3 id="titulo-datos-constancia" className="text-titulo-16">
                Datos de la constancia
              </h3>
              <p className="max-w-2xl text-cuerpo-13 text-texto-secundario">
                Registre el ISSN y las indexaciones de cada revista, que cambian con el tiempo. Al
                editarlos, las constancias que se envíen o se descarguen desde ese momento salen con el
                texto nuevo. El texto de la constancia y de los correos se escribe en Plantillas.
              </p>
              {REVISTAS_IDS.map((r) => (
                <div key={r} className="flex max-w-2xl flex-col gap-3">
                  <DatosRevistaForm revista={r} datos={configuracion.revistas[r]} />
                </div>
              ))}
            </section>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
