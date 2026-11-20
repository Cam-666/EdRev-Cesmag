/*
 * montarRuta — ayuda de pruebas: dibuja la tabla de rutas real dentro de los proveedores reales, empezando en
 * `ruta` con el usuario dado (null = sin sesión). También una ayuda para elegir una opción de un select de Radix.
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

/** Abre un select de Radix por su etiqueta y hace clic en la opción con el nombre dado. */
export async function elegirOpcion(user: Usuaria, etiqueta: string, opcion: string) {
  await user.click(screen.getByRole('combobox', { name: etiqueta }))
  await user.click(await screen.findByRole('option', { name: opcion }))
}
