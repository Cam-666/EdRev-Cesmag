import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pestanas } from './Pestanas'

const PESTANAS = [
  { valor: 'a', etiqueta: 'Resumen', contenido: <p>Panel A</p> },
  { valor: 'b', etiqueta: 'Autores', contenido: <p>Panel B</p> },
  { valor: 'c', etiqueta: 'Historial', contenido: <p>Panel C</p> },
]

describe('Pestanas', () => {
  it('exposes tablist/tab roles and moves with arrows, Home and End', async () => {
    const user = userEvent.setup()
    render(<Pestanas etiqueta="Secciones" pestanas={PESTANAS} />)
    expect(screen.getByRole('tablist', { name: 'Secciones' })).toBeInTheDocument()

    const a = screen.getByRole('tab', { name: 'Resumen' })
    const b = screen.getByRole('tab', { name: 'Autores' })
    const c = screen.getByRole('tab', { name: 'Historial' })
    await user.click(a)
    await user.keyboard('{ArrowRight}')
    expect(b).toHaveFocus()
    expect(b).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(c).toHaveFocus()
    await user.keyboard('{Home}')
    expect(a).toHaveFocus()
    expect(screen.getByText('Panel A')).toBeInTheDocument()
  })
})
