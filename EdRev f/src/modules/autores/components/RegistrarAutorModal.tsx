/*
 * RegistrarAutorModal — registers a new reusable author record in the journal. No Figma design
 * for the dialog; it reuses the author form (without the existing-record search).
 * Covers: RF-09, RF-10.
 */
import { FormularioAutor } from './FormularioAutor'
import { useRegistrarAutor } from '../hooks/useAutores'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'

export interface RegistrarAutorModalProps {
  abierto: boolean
  onCerrar: () => void
  onRegistrado: (id: string) => void
}

export function RegistrarAutorModal({ abierto, onCerrar, onRegistrado }: RegistrarAutorModalProps) {
  const mutacion = useRegistrarAutor()
  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Registrar autor"
      descripcion="La ficha queda disponible para reutilizarla en los próximos artículos de esta revista."
    >
      <FormularioAutor
        permitirBuscar={false}
        textoBoton="Registrar autor"
        cargando={mutacion.isPending}
        error={
          mutacion.isError
            ? mensajeDeApi(mutacion.error, 'No fue posible registrar al autor. Intente de nuevo.')
            : undefined
        }
        onGuardar={({ datos }) =>
          mutacion.mutate(datos, {
            onSuccess: (autor) => {
              onRegistrado(autor.id)
              onCerrar()
            },
          })
        }
      />
    </Modal>
  )
}
