/*
 * RevistaRoute — layout route for /:revista/*. Validates the segment (reep | ire), redirecting
 * to /inicio otherwise, and provides the journal to everything below it.
 * Covers: RF-02.
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
