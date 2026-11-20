/*
 * ArticuloReabrirPage — Retomar el proceso (/:revista/articulos/:id/reabrir), un modal que se dibuja sobre la
 * ficha del artículo para que se pueda enlazar (la fila de un artículo archivado en el listado lo abre).
 * Solo para la Administradora.
 */
import { useNavigate } from 'react-router-dom'
import { ReabrirArticuloModal } from '../components/ReabrirArticuloModal'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { ArticuloResumenPage } from './ArticuloResumenPage'
import { useRevista } from '@/lib/revista/useRevista'

export function ArticuloReabrirPage() {
  const { revista } = useRevista()
  const articulo = useArticuloActual()
  const navigate = useNavigate()
  const volver = () => navigate(`/${revista}/articulos/${encodeURIComponent(articulo.id)}`)

  return (
    <>
      <ArticuloResumenPage />
      <ReabrirArticuloModal articulo={articulo} onCerrar={volver} onReabierto={volver} />
    </>
  )
}
