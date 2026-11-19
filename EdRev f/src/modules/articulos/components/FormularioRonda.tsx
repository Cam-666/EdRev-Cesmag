/*
 * FormularioRonda — registers a round of the initial committee review: the anti-plagiarism
 * report (matches % and AI %, reported separately) and the committee's observations. The result is
 * not chosen: the system decides it (matches above 15 % → Rechazado; within the limit and no
 * observations → Aprobado; within the limit with observations → Requiere ajustes) and shows it
 * before saving. The AI percentage never decides. Covers: RF-05, RF-06, HU-02, HU-03.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { UMBRAL_COINCIDENCIAS } from '../config/listas'
import { aNumero, superaUmbral } from '../config/reglas'
import { esquemaRonda } from '../config/esquemas'
import type { RondaForm } from '../config/esquemas'
import { useRegistrarRonda } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { mensajeDeApi } from '@/lib/api/errores'
import { resultadoDeRonda } from '@/lib/dominio/comite'
import type { ArticuloDetalle, ResultadoRonda } from '@/types/articulo'

const TITULO_RESULTADO: Record<ResultadoRonda, string> = {
  aprobado: 'publicable',
  ajustes: 'publicable con observaciones',
  rechazado: 'no publicable',
}

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
      observacion: '',
    },
  })

  const texto = useWatch({ control, name: 'coincidencias' })
  const coincidencias = aNumero(texto)
  const observacion = useWatch({ control, name: 'observacion' })
  const conocidas = texto.trim() !== '' && Number.isFinite(coincidencias)
  const supera = conocidas && superaUmbral(coincidencias)
  const resultadoAutomatico = conocidas
    ? resultadoDeRonda(coincidencias, observacion, UMBRAL_COINCIDENCIAS)
    : null

  function enviar(v: RondaForm) {
    const resultado = resultadoDeRonda(aNumero(v.coincidencias), v.observacion, UMBRAL_COINCIDENCIAS)
    mutacion.mutate(
      {
        coincidencias: aNumero(v.coincidencias),
        atribuidoIa: aNumero(v.atribuidoIa),
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
      <AreaTexto
        etiqueta="Observaciones del comité"
        ayuda="Opcional. Si escribe observaciones y las coincidencias están dentro del límite, el artículo queda como publicable con observaciones."
        rows={4}
        error={errors.observacion?.message}
        {...register('observacion')}
      />
      <div role="status" aria-live="polite">
        {resultadoAutomatico && (
          <Alerta
            tipo={
              resultadoAutomatico === 'rechazado'
                ? 'error'
                : resultadoAutomatico === 'ajustes'
                  ? 'advertencia'
                  : 'exito'
            }
            titulo={`Resultado: ${TITULO_RESULTADO[resultadoAutomatico]}`}
          >
            {supera
              ? `Las coincidencias (${coincidencias} %) superan el ${UMBRAL_COINCIDENCIAS} % aceptado: el sistema marca el artículo como no publicable y lo deja Rechazado, sin pares.`
              : resultadoAutomatico === 'ajustes'
                ? 'Las coincidencias están dentro del límite y hay observaciones: el sistema marca el artículo como publicable con observaciones (Requiere ajustes). El autor corrige y se registra otra ronda.'
                : 'Las coincidencias están dentro del límite y no hay observaciones: el sistema marca el artículo como publicable (Aprobado) y se pasa a la asignación de pares.'}
          </Alerta>
        )}
      </div>
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
