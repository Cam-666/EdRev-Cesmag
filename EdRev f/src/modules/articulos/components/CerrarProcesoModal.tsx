/*
 * CerrarProcesoModal — closes the process of an article as Aprobado, Rechazado or Archivado.
 * The reason is required and stays in the article's history; approving also registers the volume
 * and number of the publication, together. Everything registered so far is kept.
 * No Figma design for the dialog. Covers: RF-04, RF-08, HU-05.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { esquemaCierre } from '../config/esquemas'
import type { CierreForm } from '../config/esquemas'
import { useCerrarArticulo } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ArticuloDetalle, CierreArticulo } from '@/types/articulo'

const OPCIONES = [
  { valor: 'aprobado', etiqueta: 'Aprobado' },
  { valor: 'rechazado', etiqueta: 'Rechazado' },
  { valor: 'archivado', etiqueta: 'Archivado' },
]

const FORMULARIO = 'formulario-cierre'

export interface CerrarProcesoModalProps {
  articulo: ArticuloDetalle
  abierto: boolean
  onCerrar: () => void
}

/** Mounted only while open so every opening starts empty. */
export function CerrarProcesoModal(props: CerrarProcesoModalProps) {
  return props.abierto ? <Contenido {...props} /> : null
}

function Contenido({ articulo, onCerrar }: CerrarProcesoModalProps) {
  const cerrar = useCerrarArticulo(articulo.id)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CierreForm>({
    resolver: zodResolver(esquemaCierre),
    defaultValues: {
      estado: '',
      motivo: '',
      volumen: articulo.publicacion ? String(articulo.publicacion.volumen) : '',
      numero: articulo.publicacion ? String(articulo.publicacion.numero) : '',
    },
  })
  const estado = useWatch({ control, name: 'estado' })

  function enviar(v: CierreForm) {
    const aprobado = v.estado === 'aprobado'
    cerrar.mutate(
      {
        estado: v.estado as CierreArticulo['estado'],
        motivo: v.motivo,
        publicacion: aprobado ? { volumen: Number(v.volumen), numero: Number(v.numero) } : null,
      },
      { onSuccess: onCerrar },
    )
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Cerrar el proceso"
      descripcion={`Artículo ${articulo.numeroOjs}. Lo registrado hasta ahora se conserva.`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={cerrar.isPending}>
            Cerrar el proceso
          </Boton>
        </>
      }
    >
      <form
        id={FORMULARIO}
        onSubmit={handleSubmit(enviar)}
        noValidate
        className="flex flex-col gap-3"
      >
        {cerrar.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(cerrar.error, 'No fue posible cerrar el proceso.')}
          </Alerta>
        )}
        <Controller
          control={control}
          name="estado"
          render={({ field }) => (
            <ListaDesplegable
              etiqueta="Nuevo estado"
              opciones={OPCIONES}
              valor={field.value || undefined}
              onCambio={field.onChange}
              error={errors.estado?.message}
            />
          )}
        />
        {estado === 'aprobado' && (
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto
              etiqueta="Volumen"
              inputMode="numeric"
              error={errors.volumen?.message}
              {...register('volumen')}
            />
            <CampoTexto
              etiqueta="Número"
              inputMode="numeric"
              error={errors.numero?.message}
              {...register('numero')}
            />
          </div>
        )}
        <AreaTexto
          etiqueta="Motivo"
          rows={3}
          error={errors.motivo?.message}
          {...register('motivo')}
        />
      </form>
    </Modal>
  )
}
