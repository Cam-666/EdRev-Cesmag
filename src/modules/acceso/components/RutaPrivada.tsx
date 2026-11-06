/*
 * RutaPrivada — guard for every route that needs authentication (frontend counterpart of the
 * backend's auth middleware). Without a session it redirects to /acceso, remembering the origin.
 * Covers: HU-28, RF-39, RNF-05.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '../hooks/useSesion'

export function RutaPrivada() {
  const { usuario } = useSesion()
  const ubicacion = useLocation()
  if (!usuario) return <Navigate to="/acceso" replace state={{ desde: ubicacion.pathname }} />
  return <Outlet />
}
