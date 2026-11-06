/*
 * ArticuloReabrirPage — Retomar el proceso (/:revista/articulos/:id/reabrir), a modal rendered
 * over the article sheet so it is linkable.
 * Covers: RF-08, HU-05.
 * Status: empty modal, built in phase 4.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { ArticuloResumenPage } from './ArticuloResumenPage'
import { useRevista } from '@/app/useRevista'
import { Boton } from '@/design-system/Boton'
import { Modal } from '@/design-system/Modal'

export function ArticuloReabrirPage() {
  const { revista } = useRevista()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const cerrar = () => navigate(`/${revista}/articulos/${id}`)

  return (
    <>
      <ArticuloResumenPage />
      <Modal
        abierto
        onCerrar={cerrar}
        titulo="Retomar el proceso"
        descripcion="Pantalla pendiente · fase 4. Cubrirá: RF-08, HU-05."
        acciones={
          <Boton variante="neutro" onClick={cerrar}>
            Cancelar
          </Boton>
        }
      />
    </>
  )
}
