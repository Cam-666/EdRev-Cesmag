/*
 * EditarArticuloModal — edits title, type and publication number of an article. The OJS number
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

export function EditarArticuloModal({ articulo, abierto, onCerrar }: EditarArticuloModalProps) {
  const mutacion = useEditarArticulo(articulo.id)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EdicionArticuloForm>({
    resolver: zodResolver(esquemaEdicionArticulo),
    values: {
      titulo: articulo.titulo,
      tipo: articulo.tipo,
      numeroPublicacion: articulo.numeroPublicacion ?? '',
    },
  })

  function enviar(datos: EdicionArticuloForm) {
    mutacion.mutate(
      {
        titulo: datos.titulo,
        tipo: datos.tipo as TipoArticulo,
        numeroPublicacion: datos.numeroPublicacion || null,
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
        <CampoTexto
          etiqueta="Nº de publicación"
          placeholder="Vol. 10 n.º 2"
          ayuda="Número de la revista en que se publicará el artículo."
          {...register('numeroPublicacion')}
        />
      </form>
    </Modal>
  )
}
