/*
 * AgregarAutorModal — adds an author (an existing record or a new one) to an article, up to the
 * limit of seven. No Figma design for the dialog; it reuses the step-2 author form.
 * Covers: RF-09, RF-10, HU-06, HU-07.
 */
import { MAX_AUTORES } from '../config/listas'
import { useAgregarAutor } from '../hooks/useMutacionesArticulo'
import { FormularioAutor } from '@/modules/autores/components/FormularioAutor'
import { Alerta } from '@/components/common/Alerta'
import { Modal } from '@/components/common/Modal'
import type { ArticuloDetalle } from '@/types/articulo'

export interface AgregarAutorModalProps {
  articulo: ArticuloDetalle
  abierto: boolean
  onCerrar: () => void
}

export function AgregarAutorModal({ articulo, abierto, onCerrar }: AgregarAutorModalProps) {
  const mutacion = useAgregarAutor(articulo.id)
  const completo = articulo.autores.length >= MAX_AUTORES

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Agregar autor"
      descripcion={`Se agregará al final de la lista del artículo ${articulo.numeroOjs}.`}
    >
      {completo ? (
        <Alerta tipo="advertencia">El artículo ya tiene el máximo de {MAX_AUTORES} autores.</Alerta>
      ) : (
        <FormularioAutor
          textoBoton="Agregar"
          idsExcluidos={articulo.autores.map((a) => a.id)}
          cargando={mutacion.isPending}
          error={
            mutacion.isError ? 'No fue posible agregar el autor. Intente de nuevo.' : undefined
          }
          onGuardar={({ autorId, datos }) =>
            mutacion.mutate(autorId ? { autorId } : { nuevo: datos }, { onSuccess: onCerrar })
          }
        />
      )}
    </Modal>
  )
}
