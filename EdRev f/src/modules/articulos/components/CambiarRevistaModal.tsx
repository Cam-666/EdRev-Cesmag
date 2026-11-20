/*
 * CambiarRevistaModal — pasa un artículo a la otra revista (por ejemplo cuando el comité dice «cambiar a revista
 * Investigium»). Se puede hacer en cualquier etapa y las veces que haga falta. El artículo conserva sus pares,
 * correos y constancias; se borran su volumen y su número. El cambio queda en el historial.
 * No tiene diseño en Figma.
 */
import { useNavigate } from 'react-router-dom'
import { useTrasladarArticulo } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { useRevista } from '@/lib/revista/useRevista'
import { REVISTAS } from '@/types/revista'
import type { ArticuloDetalle } from '@/types/articulo'

export interface CambiarRevistaModalProps {
  articulo: ArticuloDetalle
  abierto: boolean
  onCerrar: () => void
}

export function CambiarRevistaModal({ articulo, abierto, onCerrar }: CambiarRevistaModalProps) {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const mutacion = useTrasladarArticulo(articulo.id)
  const destino = revista === 'reep' ? 'ire' : 'reep'

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Cambiar a ${REVISTAS[destino].nombreCorto}`}
      descripcion={`El artículo ${articulo.numeroOjs} pasa a ${REVISTAS[destino].nombre} con sus autores, rondas e historial.`}
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            cargando={mutacion.isPending}
            onClick={() =>
              mutacion.mutate(undefined, {
                onSuccess: (movido) => {
                  onCerrar()
                  navigate(`/${destino}/articulos/${encodeURIComponent(movido.id)}/comite`)
                },
              })
            }
          >
            Cambiar de revista
          </Boton>
        </>
      }
    >
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible cambiar el artículo de revista.')}
        </Alerta>
      )}
    </Modal>
  )
}
