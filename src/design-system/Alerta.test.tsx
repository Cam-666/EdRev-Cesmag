import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { Alerta } from './Alerta'
import type { TipoAlerta } from './Alerta'

describe('Alerta', () => {
  it('errors use role=alert, the rest role=status', () => {
    render(<Alerta tipo="error">Falló el envío</Alerta>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falló el envío')
  })

  it.each<TipoAlerta>(['informacion', 'advertencia', 'exito'])(
    '%s uses role=status with text label',
    async (tipo) => {
      const { container } = render(<Alerta tipo={tipo}>Mensaje</Alerta>)
      expect(screen.getByRole('status')).toHaveTextContent('Mensaje')
      expect(await axe(container)).toHaveNoViolations()
    },
  )
})
