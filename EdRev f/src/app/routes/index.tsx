/* routes — la tabla completa de rutas: públicas, privadas (detrás del guardia de sesión) y la 404. */
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { NoEncontradaPage } from '../NoEncontradaPage'
import { rutasPrivadas } from './privadas'
import { rutasPublicas } from './publicas'

export const rutas: RouteObject[] = [
  { path: '/', element: <Navigate to="/inicio" replace /> },
  ...rutasPublicas,
  ...rutasPrivadas,
  { path: '*', element: <NoEncontradaPage /> },
]
