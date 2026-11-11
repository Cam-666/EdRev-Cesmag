import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PanelLateral } from './PanelLateral'

function montar(revistaActiva: 'reep' | 'ire' | null, ruta: string) {
  render(
    <MemoryRouter>
      <PanelLateral
        revistaActiva={revistaActiva}
        rutaActual={ruta}
        usuario={{ nombre: 'Ma. Camila Mendoza', perfil: 'Administradora' }}
        onCerrarSesion={() => undefined}
      />
    </MemoryRouter>,
  )
}

describe('PanelLateral', () => {
  it('opens only the active journal group, with six submodules', () => {
    montar('reep', '/reep/articulos')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Tablero' })).toHaveAttribute(
      'href',
      '/reep/tablero',
    )
    expect(within(nav).queryByRole('link', { name: 'Correos enviados' })).toHaveAttribute(
      'href',
      '/reep/correos',
    )
    // IRE group is closed: its submodules are not rendered
    expect(
      within(nav).queryByText('Pares evaluadores', { selector: '[href="/ire/pares"]' }),
    ).toBeNull()
  })

  it('current item is highlighted and is not a link', () => {
    montar('reep', '/reep/articulos')
    const actual = screen.getByText('Artículos')
    expect(actual).toHaveAttribute('aria-current', 'page')
    expect(actual.closest('a')).toBeNull()
  })

  it('a click opens a journal group and another click closes it', async () => {
    montar('reep', '/reep/tablero')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    const ire = screen.getByRole('button', { name: 'Investigium IRE' })
    expect(ire).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(ire)
    expect(ire).toHaveAttribute('aria-expanded', 'true')
    expect(nav.querySelector('[href="/ire/pares"]')).not.toBeNull()

    await userEvent.click(ire)
    expect(ire).toHaveAttribute('aria-expanded', 'false')
    expect(nav.querySelector('[href="/ire/pares"]')).toBeNull()
  })

  it('the active journal group can be closed and opened again', async () => {
    montar('reep', '/reep/articulos')
    const reep = screen.getByRole('button', { name: 'Educación y Pedagogía' })
    expect(reep).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(reep)
    expect(reep).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Artículos')).toBeNull()
    await userEvent.click(reep)
    expect(screen.getByText('Artículos')).toHaveAttribute('aria-current', 'page')
  })

  it('does not show the "Módulo" labels', () => {
    montar(null, '/inicio')
    expect(screen.queryByText(/Módulo \d/)).toBeNull()
  })
})
