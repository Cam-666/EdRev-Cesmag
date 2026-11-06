/*
 * ArticuloReabrirPage — Retomar el proceso (/:revista/articulos/:id/reabrir), a modal rendered
 * over the article sheet so it is linkable (the archived row of the list opens it). Administradora
 * only (RNF-05). Covers: RF-08, HU-05.
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
