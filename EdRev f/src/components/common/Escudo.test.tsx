import { render, screen } from '@testing-library/react'
import { Escudo } from './Escudo'

describe('Escudo', () => {
  it('is decorative by default (the university name is written next to it)', () => {
    const { container } = render(<Escudo />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('alt', '')
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('exposes its alternative text when given', () => {
    render(<Escudo alt="Escudo de la Universidad CESMAG" />)
    expect(screen.getByRole('img', { name: 'Escudo de la Universidad CESMAG' })).toBeInTheDocument()
  })
})
