import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { EstadoConsulta } from './EstadoConsulta'

describe('EstadoConsulta', () => {
  it('announces loading without showing the content', () => {
    render(
      <EstadoConsulta
        cargando
        error={false}
        onReintentar={() => undefined}
        descripcion="el listado"
      >
        <p>Contenido</p>
      </EstadoConsulta>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el listado…')
    expect(screen.queryByText('Contenido')).toBeNull()
  })

  it('shows an error with a retry button', async () => {
    const onReintentar = vi.fn()
    render(
      <EstadoConsulta cargando={false} error onReintentar={onReintentar} descripcion="el artículo">
        <p>Contenido</p>
      </EstadoConsulta>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('No fue posible cargar el artículo')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onReintentar).toHaveBeenCalledOnce()
  })

  it('renders the content when there is data', () => {
    render(
      <EstadoConsulta cargando={false} error={false} onReintentar={() => undefined} descripcion="x">
        <p>Contenido</p>
      </EstadoConsulta>,
    )
    expect(screen.getByText('Contenido')).toBeInTheDocument()
  })
})
