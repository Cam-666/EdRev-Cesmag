/*
 * RevistaRoute — ruta de marco para /:revista/*. Valida el segmento (reep | ire), redirigiendo a /inicio si no
 * lo es, y entrega la revista a todo lo que está debajo.
 */
import { Navigate, Outlet, useParams } from 'react-router-dom'
import { RevistaProvider } from './RevistaProvider'
import { esRevista } from '@/types/revista'

export function RevistaRoute() {
  const { revista } = useParams()
  if (!esRevista(revista)) return <Navigate to="/inicio" replace />
  return (
    <RevistaProvider revista={revista}>
      <Outlet />
    </RevistaProvider>
  )
}
