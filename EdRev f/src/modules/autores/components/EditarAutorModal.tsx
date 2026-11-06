/*
 * EditarAutorModal — edits the reusable record of an author (the change is seen by every article
 * of the journal that includes the author). No Figma design for the dialog itself.
 * Covers: RF-09, RF-10, RF-44 (manual correction), RNF-05 (Auxiliar can register data).
 */
import { FormularioAutor } from './FormularioAutor'
import { useEditarAutor } from '../hooks/useEditarAutor'
import { Modal } from '@/components/common/Modal'
import type { Autor } from '@/types/autor'

export interface EditarAutorModalProps {
  autor: Autor | null
  onCerrar: () => void
}

export function EditarAutorModal({ autor, onCerrar }: EditarAutorModalProps) {
  const mutacion = useEditarAutor()
  return (
    <Modal
      abierto={autor !== null}
      onCerrar={onCerrar}
      titulo="Editar autor"
      descripcion="Los cambios se aplican a la ficha del autor en esta revista."
    >
      {autor && (
        <FormularioAutor
          permitirBuscar={false}
          textoBoton="Guardar cambios"
          valoresIniciales={{
            nombre: autor.nombre,
            correo: autor.correo,
            orcid: autor.orcid,
            filiacion: autor.filiacion,
            pais: autor.pais,
          }}
          cargando={mutacion.isPending}
          error={
            mutacion.isError ? 'No fue posible guardar los cambios. Intente de nuevo.' : undefined
          }
          onGuardar={({ datos }) =>
            mutacion.mutate({ id: autor.id, datos }, { onSuccess: onCerrar })
          }
        />
      )}
    </Modal>
  )
}
