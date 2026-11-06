/*
 * Public routes — no session required: the three access screens (and, in development only,
 * the design-system showcase). Covers: HU-28, RF-39.
 */
import type { RouteObject } from 'react-router-dom'
import { AccesoLayout } from '../AccesoLayout'
import { MuestraDiseno } from '../MuestraDiseno'
import { AccesoPage } from '@/modules/acceso/pages/AccesoPage'
import { RecuperarEnviadoPage } from '@/modules/acceso/pages/RecuperarEnviadoPage'
import { RecuperarPage } from '@/modules/acceso/pages/RecuperarPage'

export const rutasPublicas: RouteObject[] = [
  ...(import.meta.env.DEV ? [{ path: '/design-system', element: <MuestraDiseno /> }] : []),
  {
    element: <AccesoLayout />,
    children: [
      { path: '/acceso', element: <AccesoPage /> },
      { path: '/acceso/recuperar', element: <RecuperarPage /> },
      { path: '/acceso/recuperar/enviado', element: <RecuperarEnviadoPage /> },
    ],
  },
]
