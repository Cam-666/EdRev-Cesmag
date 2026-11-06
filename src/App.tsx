/*
 * App — root: mounts the router built from the route table.
 */
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { rutas } from '@/app/routes'

const router = createBrowserRouter(rutas)

export function App() {
  return <RouterProvider router={router} />
}
