import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { Tabla } from './Tabla'

interface Fila {
  id: string
  titulo: string
}

const COLUMNAS = [
  { clave: 'id', encabezado: 'Nº OJS', render: (f: Fila) => f.id },
  { clave: 'titulo', encabezado: 'Título', render: (f: Fila) => f.titulo },
]

describe('Tabla', () => {
  it('renders th scope=col headers and a clickable row link', async () => {
    const { container } = render(
      <MemoryRouter>
        <Tabla
          etiqueta="Artículos"
          columnas={COLUMNAS}
          filas={[{ id: '2026-034', titulo: 'Alfabetización mediática' }]}
          obtenerClave={(f) => f.id}
          hrefFila={(f) => `/reep/articulos/${f.id}`}
          etiquetaEnlace={(f) => `Abrir ${f.id}`}
        />
      </MemoryRouter>,
    )
    const encabezados = screen.getAllByRole('columnheader')
    expect(encabezados).toHaveLength(2)
    encabezados.forEach((th) => expect(th).toHaveAttribute('scope', 'col'))
    expect(screen.getByRole('link', { name: 'Abrir 2026-034' })).toHaveAttribute(
      'href',
      '/reep/articulos/2026-034',
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows the empty state', () => {
    render(
      <MemoryRouter>
        <Tabla
          etiqueta="Vacía"
          columnas={COLUMNAS}
          filas={[]}
          obtenerClave={(f) => f.id}
          vacio="Sin artículos"
        />
      </MemoryRouter>,
    )
    expect(screen.getByText('Sin artículos')).toBeInTheDocument()
  })

  it('shows the loading state as busy', () => {
    render(
      <MemoryRouter>
        <Tabla
          etiqueta="Cargando"
          columnas={COLUMNAS}
          filas={[]}
          obtenerClave={(f) => f.id}
          cargando
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Cargando datos…')).toBeInTheDocument()
  })
})
