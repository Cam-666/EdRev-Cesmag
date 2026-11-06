import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AreaTexto } from './AreaTexto'

describe('AreaTexto', () => {
  it('ties the visible label to the field and has no a11y violations', async () => {
    const { container } = render(
      <AreaTexto etiqueta="Motivo de la reapertura" ayuda="Quedará registrado." />,
    )
    const campo = screen.getByLabelText('Motivo de la reapertura')
    expect(campo.tagName).toBe('TEXTAREA')
    expect(campo).toHaveAccessibleDescription('Quedará registrado.')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('announces its error and links it with aria-describedby', () => {
    render(<AreaTexto etiqueta="Observación" error="Escriba la observación." />)
    const campo = screen.getByLabelText('Observación')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Escriba la observación.')
    expect(campo.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id)
  })
})
