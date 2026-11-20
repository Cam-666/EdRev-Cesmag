/*
 * AgregarAutorModal — agrega un autor (uno existente o uno nuevo) a un artículo, hasta el límite de siete.
 * No tiene diseño en Figma; reutiliza el formulario de autor del paso 2.
 */
import { MAX_AUTORES } from '../config/listas'
import { useAgregarAutor } from '../hooks/useMutacionesArticulo'
import { FormularioAutor } from '@/modules/autores/components/FormularioAutor'
import { Alerta } from '@/components/common/Alerta'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
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
            mutacion.isError
              ? mensajeDeApi(mutacion.error, 'No fue posible agregar el autor. Intente de nuevo.')
              : undefined
          }
          onGuardar={({ autorId, datos }) =>
            mutacion.mutate(autorId ? { autorId } : { nuevo: datos }, { onSuccess: onCerrar })
          }
        />
      )}
    </Modal>
  )
}
