import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { rutas } from '.'
import { Proveedores } from '../Proveedores'
import { ADMINISTRADORA, AUXILIAR } from '@/mocks/seed/usuarios'
import type { Usuario } from '@/types/usuario'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

/** The 18 views each journal has, identical for reep and ire. */
const VISTAS = [
  'tablero',
  'articulos',
  'articulos/nuevo',
  'articulos/nuevo/autores',
  'articulos/2026-034',
  'articulos/2026-034/autores',
  'articulos/2026-034/pares',
  'articulos/2026-034/observaciones',
  'articulos/2026-034/historial',
  'articulos/2026-034/antiplagio',
  'articulos/2026-034/reabrir',
  'autores',
  'pares',
  'pares/bloqueados',
  'pares/asignar',
  'pares/p-1',
  'constancias',
  'correos',
]

function montar(ruta: string, usuario: Usuario | null = ADMINISTRADORA) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const vista = render(
    <Proveedores usuarioInicial={usuario}>
      <RouterProvider router={router} />
    </Proveedores>,
  )
  return { router, ...vista }
}

const REVISTAS_IDS: Revista[] = ['reep', 'ire']

describe('route table', () => {
  it('defines 18 views per journal', () => {
    expect(VISTAS).toHaveLength(18)
  })

  describe.each(REVISTAS_IDS)('journal %s', (revista) => {
    const otra: Revista = revista === 'reep' ? 'ire' : 'reep'

    it.each(VISTAS)(
      'renders /%s with its own top bar and no data of the other journal',
      (vista) => {
        const { container } = montar(`/${revista}/${vista}`)
        expect(container.querySelector('[data-revista]')).toHaveAttribute('data-revista', revista)
        expect(screen.getByText(`ISSN ${REVISTAS[revista].issn}`)).toBeInTheDocument()
        expect(screen.queryByText(`ISSN ${REVISTAS[otra].issn}`)).toBeNull()
        expect(screen.getByRole('main', { hidden: true })).toBeInTheDocument()
        expect(screen.getAllByRole('heading', { level: 1, hidden: true })).toHaveLength(1)
        // The side panel only lists the active journal's submodules.
        const nav = screen.getByRole('navigation', { name: 'Principal', hidden: true })
        expect(
          within(nav)
            .queryAllByRole('link')
            .some((a) => a.getAttribute('href')?.startsWith(`/${otra}/`)),
        ).toBe(false)
      },
    )
  })

  it('redirects an unknown journal to /inicio', () => {
    const { router } = montar('/xyz/tablero')
    expect(router.state.location.pathname).toBe('/inicio')
  })

  it('redirects /:revista to its dashboard', () => {
    const { router } = montar('/ire')
    expect(router.state.location.pathname).toBe('/ire/tablero')
  })

  it.each([
    '/inicio',
    '/informes',
    '/administracion/usuarios',
    '/administracion/plantillas',
    '/administracion/auditoria',
  ])('cross-journal module %s has no journal palette and no open journal group', (ruta) => {
    const { container } = montar(ruta)
    expect(container.querySelector('[data-revista]')).toBeNull()
    expect(screen.getByText('Las dos revistas')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Principal', hidden: true })
    expect(within(nav).queryByRole('link', { name: 'Tablero' })).toBeNull()
  })

  it('opening the other journal in the side panel switches the top bar only', async () => {
    const { router, container } = montar('/reep/articulos')
    await userEvent.click(screen.getByRole('button', { name: /Investigium IRE/ }))
    expect(router.state.location.pathname).toBe('/ire/tablero')
    expect(container.querySelector('[data-revista]')).toHaveAttribute('data-revista', 'ire')
    expect(screen.getByText('ISSN 2357-5239')).toBeInTheDocument()
  })

  it('provides a skip link to the main content', () => {
    montar('/inicio')
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    )
  })

  it('shows the three access screens without the side panel', () => {
    for (const ruta of ['/acceso', '/acceso/recuperar', '/acceso/recuperar/enviado']) {
      const { unmount } = montar(ruta, null)
      expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      unmount()
    }
  })

  it('article sheet tabs navigate between routes', async () => {
    const { router } = montar('/reep/articulos/2026-034')
    await userEvent.click(screen.getByRole('tab', { name: 'Autores' }))
    expect(router.state.location.pathname).toBe('/reep/articulos/2026-034/autores')
    expect(screen.getByRole('tab', { name: 'Autores' })).toHaveAttribute('aria-selected', 'true')
  })

  it('the retake modal opens over the sheet and Escape returns to it', async () => {
    const { router } = montar('/reep/articulos/2026-007/reabrir')
    expect(screen.getByRole('dialog', { name: 'Retomar el proceso' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(router.state.location.pathname).toBe('/reep/articulos/2026-007')
  })
  describe('authentication and authorization', () => {
    it.each([
      '/inicio',
      '/informes',
      '/administracion/usuarios',
      '/reep/tablero',
      '/ire/articulos',
    ])('redirects %s to /acceso without a session', (ruta) => {
      const { router } = montar(ruta, null)
      expect(router.state.location.pathname).toBe('/acceso')
      expect(screen.queryByRole('navigation', { name: 'Principal' })).toBeNull()
    })

    it('keeps the access screens reachable without a session', () => {
      const { router } = montar('/acceso/recuperar', null)
      expect(router.state.location.pathname).toBe('/acceso/recuperar')
    })

    it('blocks Administración for the Auxiliar profile', () => {
      montar('/administracion/usuarios', AUXILIAR)
      expect(
        screen.getByRole('heading', { level: 1, name: 'Acceso restringido' }),
      ).toBeInTheDocument()
      expect(screen.queryByRole('tab', { name: 'Usuarios' })).toBeNull()
    })

    it('lets the Auxiliar work in the journal modules', () => {
      montar('/ire/articulos', AUXILIAR)
      expect(screen.getByText('ISSN 2357-5239')).toBeInTheDocument()
    })

    it('lets the Administradora into Administración', () => {
      montar('/administracion/plantillas', ADMINISTRADORA)
      expect(screen.getByRole('tab', { name: 'Plantillas' })).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    it('logging out sends the user back to /acceso', async () => {
      const { router } = montar('/inicio')
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
      expect(router.state.location.pathname).toBe('/acceso')
    })
  })
})
