/*
 * montarRuta — test helper: renders the real route table inside the real providers, starting at
 * `ruta` with the given user (null = signed out). Also a helper to pick an option of a Radix select.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { Proveedores } from '@/app/Proveedores'
import { rutas } from '@/app/routes'
import { ADMINISTRADORA } from '@/mocks/seed/usuarios'
import type { Usuario } from '@/types/usuario'

export function montarRuta(ruta: string, usuario: Usuario | null = ADMINISTRADORA) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const vista = render(
    <Proveedores usuarioInicial={usuario}>
      <RouterProvider router={router} />
    </Proveedores>,
  )
  return { router, user: userEvent.setup(), ...vista }
}

export type Usuaria = ReturnType<typeof userEvent.setup>

/** Opens a Radix select by its label and clicks the option with the given name. */
export async function elegirOpcion(user: Usuaria, etiqueta: string, opcion: string) {
  await user.click(screen.getByRole('combobox', { name: etiqueta }))
  await user.click(await screen.findByRole('option', { name: opcion }))
}
