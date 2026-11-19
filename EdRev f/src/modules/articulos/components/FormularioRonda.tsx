/*
 * FormularioRonda — registers a round of the initial committee review: the anti-plagiarism
 * report (matches % and AI %, reported separately) and the committee's observations. The system
 * proposes the result (matches above 15 % → no publicable; within the limit and no observations →
 * publicable; within the limit with observations → publicable con observaciones) and shows it before
 * saving. A round «no publicable» does not close the article: it stays in review and another round
 * is registered, or the committee approves the round anyway. The AI percentage never decides.
 * Covers: RF-05, RF-06, HU-02, HU-03.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import { Casilla } from '@/components/common/Casilla'
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
  // The committee may approve a round that the report does not approve (RF-06).
  const [aprobarIgual, setAprobarIgual] = useState(false)
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
  const aprobar = aprobarIgual && resultadoAutomatico !== null && resultadoAutomatico !== 'aprobado'

  function enviar(v: RondaForm) {
    const propuesto = resultadoDeRonda(aNumero(v.coincidencias), v.observacion, UMBRAL_COINCIDENCIAS)
    const resultado: ResultadoRonda = aprobar ? 'aprobado' : propuesto
    mutacion.mutate(
      {
        coincidencias: aNumero(v.coincidencias),
        atribuidoIa: aNumero(v.atribuidoIa),
        observacion: v.observacion,
        ...(aprobar ? { aprobar: true } : {}),
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
            tipo={aprobar || resultadoAutomatico === 'aprobado' ? 'exito' : 'advertencia'}
            titulo={
              aprobar
                ? 'Resultado: aprobado por decisión del comité'
                : `Resultado: ${TITULO_RESULTADO[resultadoAutomatico]}`
            }
          >
            {aprobar
              ? `El comité aprueba esta ronda aunque el reporte indicaba «${TITULO_RESULTADO[resultadoAutomatico]}». Queda registrado en el historial y se pasa a la asignación de pares.`
              : supera
                ? `Las coincidencias (${coincidencias} %) superan el ${UMBRAL_COINCIDENCIAS} % aceptado: la ronda queda como no publicable. El proceso no se cierra: el artículo sigue en revisión y se registra otra ronda cuando el autor corrija, o el comité aprueba esta ronda si decide continuar.`
                : resultadoAutomatico === 'ajustes'
                  ? 'Las coincidencias están dentro del límite y hay observaciones: la ronda queda como publicable con observaciones (Requiere ajustes). El autor corrige y se registra otra ronda, o el comité aprueba esta si decide continuar.'
                  : 'Las coincidencias están dentro del límite y no hay observaciones: la ronda queda como publicable (Aprobado) y se pasa a la asignación de pares.'}
          </Alerta>
        )}
      </div>
      {resultadoAutomatico !== null && resultadoAutomatico !== 'aprobado' && (
        <Casilla
          etiqueta="Aprobar esta ronda por decisión del comité"
          marcada={aprobarIgual}
          onCambio={setAprobarIgual}
        />
      )}
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
