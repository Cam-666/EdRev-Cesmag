/*
 * App — root: providers + router built from the route table.
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Proveedores } from '@/app/Proveedores'
import { rutas } from '@/app/routes'

const router = createBrowserRouter(rutas)

export function App() {
  return (
    <Proveedores>
      <RouterProvider router={router} />
    </Proveedores>
  )
}
