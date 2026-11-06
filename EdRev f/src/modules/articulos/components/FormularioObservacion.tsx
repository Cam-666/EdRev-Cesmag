/*
 * FormularioObservacion — "Escribir una observación": the note is saved with the date and the
 * name of the logged-in user, shown beforehand ("Se registrará como…"). Covers: RF-07, HU-04.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { esquemaObservacion } from '../config/esquemas'
import type { ObservacionForm } from '../config/esquemas'
import { useAgregarObservacion } from '../hooks/useObservaciones'
import { useUsuarioActual } from '@/modules/acceso/hooks/useSesion'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { formatearFecha } from '@/lib/format'

export interface FormularioObservacionProps {
  articuloId: string
}

export function FormularioObservacion({ articuloId }: FormularioObservacionProps) {
  const usuario = useUsuarioActual()
  const mutacion = useAgregarObservacion(articuloId)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObservacionForm>({
    resolver: zodResolver(esquemaObservacion),
    defaultValues: { texto: '' },
  })

  function enviar({ texto }: ObservacionForm) {
    mutacion.mutate(texto, { onSuccess: () => reset({ texto: '' }) })
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-3">
      {mutacion.isError && (
        <Alerta tipo="error">No fue posible guardar la observación. Intente de nuevo.</Alerta>
      )}
      <AreaTexto
        etiqueta="Escribir una observación"
        ayuda={`Se registrará como ${usuario.nombre} · ${formatearFecha(new Date().toISOString())}`}
        error={errors.texto?.message}
        {...register('texto')}
      />
      <div>
        <Boton type="submit" cargando={mutacion.isPending}>
          Guardar
        </Boton>
      </div>
    </form>
  )
}
