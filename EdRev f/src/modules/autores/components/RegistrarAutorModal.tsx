/*
 * RegistrarAutorModal — registra un autor nuevo en el directorio común de las dos revistas. No tiene diseño en
 * Figma; reutiliza el formulario de autor (sin la búsqueda de registros existentes).
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
      descripcion="La ficha queda disponible para reutilizarla en los próximos artículos de ambas revistas."
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
