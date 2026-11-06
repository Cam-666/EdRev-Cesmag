/*
 * FormularioRevision — anti-plagiarism report (matches % and AI %, reported separately) and the
 * committee review (initial or final, chosen from the closed list of six results, with an
 * observation). The warning above 15 % appears next to the field, never blocks saving, and the
 * AI percentage never triggers it. Covers: RF-05, RF-06, HU-02, HU-03.
 * The "Etapa" selector (initial / final) has no design in Figma: RF-06 requires both reviews.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { RESULTADOS_COMITE, UMBRAL_COINCIDENCIAS } from '../config/listas'
import { aNumero, superaUmbral } from '../config/reglas'
import { esquemaRevision } from '../config/esquemas'
import type { RevisionForm } from '../config/esquemas'
import { useRegistrarRevision } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import type { ArticuloDetalle, ResultadoComite } from '@/types/articulo'

export interface FormularioRevisionProps {
  articulo: ArticuloDetalle
  /** Id of the <form>, so header buttons ("Guardar") can submit it. */
  idFormulario: string
  onGuardado: () => void
}

const SIN_CAMBIOS = 'ninguno'

export function FormularioRevision({
  articulo,
  idFormulario,
  onGuardado,
}: FormularioRevisionProps) {
  const mutacion = useRegistrarRevision(articulo.id)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RevisionForm>({
    resolver: zodResolver(esquemaRevision),
    defaultValues: {
      coincidencias: articulo.antiplagio ? String(articulo.antiplagio.coincidencias) : '',
      atribuidoIa: articulo.antiplagio ? String(articulo.antiplagio.atribuidoIa) : '',
      observacionAntiplagio: articulo.antiplagio?.observacion ?? '',
      etapa: articulo.revisionInicial ? 'final' : 'inicial',
      resultado: '',
      observacionComite: '',
    },
  })

  const textoCoincidencias = useWatch({ control, name: 'coincidencias' })
  const coincidencias = aNumero(textoCoincidencias)
  const valida = textoCoincidencias.trim() !== '' && Number.isFinite(coincidencias)

  function enviar(v: RevisionForm) {
    mutacion.mutate(
      {
        antiplagio: {
          coincidencias: aNumero(v.coincidencias),
          atribuidoIa: aNumero(v.atribuidoIa),
          observacion: v.observacionAntiplagio,
        },
        revision:
          v.resultado === '' || v.resultado === SIN_CAMBIOS
            ? undefined
            : {
                etapa: v.etapa,
                resultado: v.resultado as ResultadoComite,
                observacion: v.observacionComite,
              },
      },
      { onSuccess: onGuardado },
    )
  }

  return (
    <form
      id={idFormulario}
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-6"
    >
      {mutacion.isError && (
        <Alerta tipo="error">No fue posible guardar. Intente de nuevo en unos minutos.</Alerta>
      )}

      <section
        aria-labelledby="titulo-reporte"
        className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
      >
        <h2 id="titulo-reporte" className="text-titulo-16">
          Reporte antiplagio
        </h2>
        {valida &&
          (superaUmbral(coincidencias) ? (
            <Alerta tipo="advertencia">
              Las coincidencias ({coincidencias} %) superan el {UMBRAL_COINCIDENCIAS} % aceptado. No
              bloquea el proceso.
            </Alerta>
          ) : (
            <Alerta tipo="exito">
              Las coincidencias ({coincidencias} %) están dentro del {UMBRAL_COINCIDENCIAS} %
              aceptado.
            </Alerta>
          ))}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CampoTexto
            etiqueta="Coincidencias (%)"
            inputMode="decimal"
            autoComplete="off"
            error={errors.coincidencias?.message}
            {...register('coincidencias')}
          />
          <CampoTexto
            etiqueta="Atribuido a IA (%)"
            inputMode="decimal"
            autoComplete="off"
            ayuda="No es causal de rechazo."
            error={errors.atribuidoIa?.message}
            {...register('atribuidoIa')}
          />
        </div>
        <AreaTexto
          etiqueta="Observación del reporte"
          rows={2}
          {...register('observacionAntiplagio')}
        />
      </section>

      <section
        aria-labelledby="titulo-comite"
        className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
      >
        <h2 id="titulo-comite" className="text-titulo-16">
          Revisión del comité editorial
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="etapa"
            render={({ field }) => (
              <ListaDesplegable
                etiqueta="Revisión"
                opciones={[
                  { valor: 'inicial', etiqueta: 'Revisión inicial' },
                  { valor: 'final', etiqueta: 'Revisión final' },
                ]}
                valor={field.value}
                onCambio={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="resultado"
            render={({ field }) => (
              <ListaDesplegable
                etiqueta="Resultado"
                opciones={[
                  { valor: SIN_CAMBIOS, etiqueta: 'Sin registrar ahora' },
                  ...RESULTADOS_COMITE,
                ]}
                valor={field.value || SIN_CAMBIOS}
                onCambio={field.onChange}
                error={errors.resultado?.message}
              />
            )}
          />
        </div>
        <AreaTexto etiqueta="Observación del comité" rows={3} {...register('observacionComite')} />
      </section>
    </form>
  )
}
