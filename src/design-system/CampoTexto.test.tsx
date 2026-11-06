import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { CampoTexto } from './CampoTexto'

describe('CampoTexto', () => {
  it('associates the visible label with the input', async () => {
    const { container } = render(<CampoTexto etiqueta="Número de OJS" />)
    expect(screen.getByLabelText('Número de OJS')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('links the error with aria-describedby and announces it with role=alert', async () => {
    const { container } = render(<CampoTexto etiqueta="Correo" error="Correo no válido" />)
    const campo = screen.getByLabelText('Correo')
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Correo no válido')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo.getAttribute('aria-describedby')).toContain(alerta.id)
    expect(await axe(container)).toHaveNoViolations()
  })
})
