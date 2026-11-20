/* App — raíz de la aplicación: los proveedores y el enrutador armado con la tabla de rutas. */
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
