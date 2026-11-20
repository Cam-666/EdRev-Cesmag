/*
 * RutaPrivada — guardia de toda ruta que exige autenticación (la contraparte en la interfaz del middleware de
 * autenticación del backend). Sin sesión redirige a /acceso, recordando de dónde venía.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSesion } from '../hooks/useSesion'

export function RutaPrivada() {
  const { usuario } = useSesion()
  const ubicacion = useLocation()
  if (!usuario) return <Navigate to="/acceso" replace state={{ desde: ubicacion.pathname }} />
  return <Outlet />
}
