/*
 * Rutas públicas — no exigen sesión: las pantallas de acceso (ingreso, recuperación, definir contraseña), la
 * página que abre un botón del correo de invitación y, solo en desarrollo, el muestrario del sistema de diseño.
 */
import type { RouteObject } from 'react-router-dom'
import { AccesoLayout } from '../AccesoLayout'
import { MuestraDiseno } from '../MuestraDiseno'
import { AccesoPage } from '@/modules/acceso/pages/AccesoPage'
import { DefinirContrasenaPage } from '@/modules/acceso/pages/DefinirContrasenaPage'
import { RespuestaInvitacionPage } from '@/modules/invitaciones/pages/RespuestaInvitacionPage'
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
      { path: '/acceso/contrasena', element: <DefinirContrasenaPage /> },
      { path: '/invitacion', element: <RespuestaInvitacionPage /> },
    ],
  },
]
