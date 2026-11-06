import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EnlaceBoton } from './EnlaceBoton'

describe('EnlaceBoton', () => {
  it('is a link (navigation) that looks like a button', () => {
    render(
      <MemoryRouter>
        <EnlaceBoton to="/reep/articulos/nuevo" variante="neutro" tamano="sm">
          Registrar artículo
        </EnlaceBoton>
      </MemoryRouter>,
    )
    const enlace = screen.getByRole('link', { name: 'Registrar artículo' })
    expect(enlace).toHaveAttribute('href', '/reep/articulos/nuevo')
    expect(screen.queryByRole('button')).toBeNull()
    expect(enlace.className).toContain('rounded-md')
  })
})
