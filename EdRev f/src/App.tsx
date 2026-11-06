/*
 * App — root: session provider + router built from the route table.
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { rutas } from '@/app/routes'
import { SesionProvider } from '@/modules/acceso/components/SesionProvider'
import { USUARIOS_SEED } from '@/mocks/seed/usuarios'

const router = createBrowserRouter(rutas)

// TODO(phase 3): start without a session (null); the login screen will set it.
const USUARIO_INICIAL = USUARIOS_SEED[0] ?? null

export function App() {
  return (
    <SesionProvider usuarioInicial={USUARIO_INICIAL}>
      <RouterProvider router={router} />
    </SesionProvider>
  )
}
