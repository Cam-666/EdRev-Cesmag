/*
 * routes — full route table: public routes, private routes (behind the auth guard) and 404.
 * Covers: RF-02, RNF-05.
 */
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
