import { render, screen } from '@testing-library/react'
import { EncabezadoRevista } from './EncabezadoRevista'
import { REVISTAS } from '@/types/revista'

describe('EncabezadoRevista', () => {
  it('REEP: coat of arms, module, real logo with the full journal name and the ISSN pill', () => {
    const { container } = render(<EncabezadoRevista revista="reep" />)
    expect(container.querySelector('header')).toHaveAttribute('data-revista', 'reep')
    expect(screen.getByText('Módulo 1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: REVISTAS.reep.nombre })).toBeInTheDocument()
    expect(screen.getByText('ISSN: 2590-7476 (En línea)')).toBeInTheDocument()
  })

  it('IRE: wordmark announced once with the full name, and the ISSN pill', () => {
    render(<EncabezadoRevista revista="ire" />)
    expect(screen.getByText('Módulo 2')).toBeInTheDocument()
    expect(screen.getByText(REVISTAS.ire.nombre)).toHaveClass('sr-only')
    expect(screen.getByText('ISSN: 2357-5239 (Digital)')).toBeInTheDocument()
  })

  it('never mixes the other journal in the same bar', () => {
    render(<EncabezadoRevista revista="reep" />)
    expect(screen.queryByText(/2357-5239/)).toBeNull()
    expect(screen.queryByText(/Investigium/)).toBeNull()
  })

  it('renders the actions slot', () => {
    render(
      <EncabezadoRevista
        revista="ire"
        acciones={<button type="button">Registrar artículo</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Registrar artículo' })).toBeInTheDocument()
  })
})
