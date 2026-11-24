/*
 * FormularioRonda — registra una ronda de la revisión inicial del comité: el reporte antiplagio (% de
 * coincidencias y % de IA, por separado), el resultado (Aprobado, Requiere ajustes o Rechazado) y las
 * observaciones del comité. El comité elige el resultado; la página solo sugiere uno a partir del reporte y las
 * observaciones (coincidencias sobre 15 % → no publicable; dentro del límite y sin observaciones → publicable;
 * dentro del límite con observaciones → publicable con observaciones), y la decisión sigue siendo del comité.
 * Ningún resultado cierra el proceso: el artículo sigue en revisión y se puede registrar otra ronda.
 * El porcentaje de IA nunca decide.
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
import { resultadoSugerido } from '@/lib/dominio/comite'
import type { ArticuloDetalle, ResultadoRonda } from '@/types/articulo'

/** Cómo nombra la sugerencia a cada resultado. */
const NOMBRE_SUGERIDO: Record<ResultadoRonda, string> = {
  aprobado: 'Aprobado (publicable)',
  ajustes: 'Requiere ajustes (publicable con observaciones)',
  rechazado: 'Rechazado (no publicable)',
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
      resultado: '',
      observacion: '',
    },
  })

  const texto = useWatch({ control, name: 'coincidencias' })
  const coincidencias = aNumero(texto)
  const observacion = useWatch({ control, name: 'observacion' })
  const conocidas = texto.trim() !== '' && Number.isFinite(coincidencias)
  const supera = conocidas && superaUmbral(coincidencias)
  const sugerido = conocidas
    ? resultadoSugerido(coincidencias, observacion, UMBRAL_COINCIDENCIAS)
    : null

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
      <div role="status" aria-live="polite">
        {sugerido && (
          <Alerta tipo="informacion" titulo={`Sugerencia: ${NOMBRE_SUGERIDO[sugerido]}`}>
            {supera
              ? `Las coincidencias (${coincidencias} %) superan el ${UMBRAL_COINCIDENCIAS} % aceptado. La decisión es del comité: ninguna opción cierra el proceso, el artículo sigue en revisión y se puede registrar otra ronda cuando el autor corrija.`
              : sugerido === 'ajustes'
                ? 'Las coincidencias están dentro del límite y hay observaciones. La decisión es del comité.'
                : 'Las coincidencias están dentro del límite y no hay observaciones. La decisión es del comité.'}
          </Alerta>
        )}
      </div>
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
