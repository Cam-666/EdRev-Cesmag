import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { vi } from 'vitest'
import { Boton } from './Boton'

describe('Boton', () => {
  it('calls onClick and has no a11y violations', async () => {
    const onClick = vi.fn()
    const { container } = render(<Boton onClick={onClick}>Guardar</Boton>)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Boton disabled onClick={onClick}>
        Guardar
      </Boton>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('loading state is busy, disabled and announced', () => {
    render(<Boton cargando>Guardar</Boton>)
    const boton = screen.getByRole('button')
    expect(boton).toBeDisabled()
    expect(boton).toHaveAttribute('aria-busy', 'true')
    expect(boton).toHaveTextContent('Cargando')
  })
})
