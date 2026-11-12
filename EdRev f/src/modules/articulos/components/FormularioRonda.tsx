/*
 * FormularioRonda — registers a round of the initial committee review: the anti-plagiarism
 * report (matches % and AI %, reported separately), the result (Aprobado, Requiere ajustes or
 * Rechazado) and the committee's observations. The warning above 15 % appears next to the field
 * and never blocks; the AI percentage never triggers it. Covers: RF-05, RF-06, HU-02, HU-03.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { RESULTADOS_RONDA, UMBRAL_COINCIDENCIAS } from '../config/listas'
import { aNumero, superaUmbral } from '../config/reglas'
import { esquemaRonda } from '../config/esquemas'
import type { RondaForm } from '../config/esquemas'
import { useRegistrarRonda } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ArticuloDetalle, ResultadoRonda } from '@/types/articulo'

export interface FormularioRondaProps {
  articulo: ArticuloDetalle
  onGuardada: (resultado: ResultadoRonda) => void
  onCancelar: () => void
}

export function FormularioRonda({ articulo, onGuardada, onCancelar }: FormularioRondaProps) {
  const mutacion = useRegistrarRonda(articulo.id)
  const numero = articulo.rondasComite.length + 1
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RondaForm>({
    resolver: zodResolver(esquemaRonda),
    defaultValues: {
      coincidencias: articulo.coincidencias === null ? '' : String(articulo.coincidencias),
      atribuidoIa: articulo.atribuidoIa === null ? '' : String(articulo.atribuidoIa),
      resultado: '',
      observacion: '',
    },
  })

  const texto = useWatch({ control, name: 'coincidencias' })
  const coincidencias = aNumero(texto)
  const supera =
    texto.trim() !== '' && Number.isFinite(coincidencias) && superaUmbral(coincidencias)

  function enviar(v: RondaForm) {
    const resultado = v.resultado as ResultadoRonda
    mutacion.mutate(
      {
        coincidencias: aNumero(v.coincidencias),
        atribuidoIa: aNumero(v.atribuidoIa),
        resultado,
        observacion: v.observacion,
      },
      { onSuccess: () => onGuardada(resultado) },
    )
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      aria-labelledby="titulo-nueva-ronda"
      className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h3 id="titulo-nueva-ronda" className="text-titulo-16">
        Ronda {numero} de la revisión del comité
      </h3>
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible guardar la ronda.')}
        </Alerta>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoTexto
          etiqueta="Coincidencias (%)"
          inputMode="decimal"
          error={errors.coincidencias?.message}
          {...register('coincidencias')}
        />
        <CampoTexto
          etiqueta="Atribuido a IA (%)"
          inputMode="decimal"
          error={errors.atribuidoIa?.message}
          {...register('atribuidoIa')}
        />
      </div>
      {supera && (
        <Alerta tipo="advertencia">
          Las coincidencias ({coincidencias} %) superan el {UMBRAL_COINCIDENCIAS} % aceptado. No
          bloquea el proceso.
        </Alerta>
      )}
      <Controller
        control={control}
        name="resultado"
        render={({ field }) => (
          <ListaDesplegable
            etiqueta="Resultado del comité"
            opciones={RESULTADOS_RONDA}
            valor={field.value || undefined}
            onCambio={field.onChange}
            error={errors.resultado?.message}
          />
        )}
      />
      <AreaTexto
        etiqueta="Observaciones del comité"
        rows={4}
        error={errors.observacion?.message}
        {...register('observacion')}
      />
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" cargando={mutacion.isPending}>
          Guardar ronda
        </Boton>
        <Boton variante="neutro" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
