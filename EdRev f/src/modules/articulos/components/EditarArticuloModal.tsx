/*
 * EditarArticuloModal — edits title, type and publication (volume and number, together) of an
 * article. The OJS number
 * is not editable (it identifies the article). No Figma design for the dialog itself.
 * Covers: RF-01, RF-04 (publication number), RNF-05 (Auxiliar can register data).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { TIPOS_ARTICULO } from '../config/listas'
import { esquemaEdicionArticulo } from '../config/esquemas'
import type { EdicionArticuloForm } from '../config/esquemas'
import { useEditarArticulo } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import type { ArticuloDetalle, TipoArticulo } from '@/types/articulo'

export interface EditarArticuloModalProps {
  articulo: ArticuloDetalle
  abierto: boolean
  onCerrar: () => void
}

const FORMULARIO = 'formulario-editar-articulo'

/** Mounted only while open: each opening starts from the saved data, not from abandoned edits. */
export function EditarArticuloModal(props: EditarArticuloModalProps) {
  return props.abierto ? <ContenidoEditarArticulo {...props} /> : null
}

function ContenidoEditarArticulo({ articulo, abierto, onCerrar }: EditarArticuloModalProps) {
  const mutacion = useEditarArticulo(articulo.id)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EdicionArticuloForm>({
    resolver: zodResolver(esquemaEdicionArticulo),
    defaultValues: {
      titulo: articulo.titulo,
      tipo: articulo.tipo,
      volumen: articulo.publicacion ? String(articulo.publicacion.volumen) : '',
      numero: articulo.publicacion ? String(articulo.publicacion.numero) : '',
    },
  })

  function enviar(datos: EdicionArticuloForm) {
    mutacion.mutate(
      {
        titulo: datos.titulo,
        tipo: datos.tipo as TipoArticulo,
        publicacion:
          datos.volumen && datos.numero
            ? { volumen: Number(datos.volumen), numero: Number(datos.numero) }
            : null,
      },
      { onSuccess: onCerrar },
    )
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Editar artículo"
      descripcion={`Datos del artículo ${articulo.numeroOjs}. El número de OJS no se puede cambiar.`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
            Guardar cambios
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
        {mutacion.isError && (
          <Alerta tipo="error">No fue posible guardar los cambios. Intente de nuevo.</Alerta>
        )}
        <CampoTexto etiqueta="Título" error={errors.titulo?.message} {...register('titulo')} />
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <ListaDesplegable
              etiqueta="Tipo de artículo"
              opciones={TIPOS_ARTICULO}
              valor={field.value}
              onCambio={field.onChange}
              error={errors.tipo?.message}
            />
          )}
        />
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
      </form>
    </Modal>
  )
}
