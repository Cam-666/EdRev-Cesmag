import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { PanelLateral } from './PanelLateral'

function montar(revistaActiva: 'reep' | 'ire' | null, ruta: string, onAbrir = vi.fn()) {
  render(
    <MemoryRouter>
      <PanelLateral
        revistaActiva={revistaActiva}
        rutaActual={ruta}
        usuario={{ nombre: 'Ma. Camila Mendoza', perfil: 'Administradora' }}
        onAbrirRevista={onAbrir}
        onCerrarSesion={() => undefined}
      />
    </MemoryRouter>,
  )
  return onAbrir
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

  it('opening the other journal asks the app to switch', async () => {
    const onAbrir = montar('reep', '/reep/tablero')
    await userEvent.click(screen.getByRole('button', { name: /Investigium IRE/ }))
    expect(onAbrir).toHaveBeenCalledWith('ire')
  })
})
