import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { axe } from 'vitest-axe'
import { Boton } from './Boton'
import { Modal } from './Modal'

function Ejemplo() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <Boton onClick={() => setAbierto(true)}>Abrir</Boton>
      <Modal
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Desbloquear par"
        descripcion="Confirme el motivo del desbloqueo."
        acciones={<Boton onClick={() => setAbierto(false)}>Aceptar</Boton>}
      />
    </>
  )
}

describe('Modal', () => {
  it('is labelled, traps focus inside, closes with Escape and returns focus', async () => {
    const user = userEvent.setup()
    const { baseElement } = render(<Ejemplo />)
    const disparador = screen.getByRole('button', { name: 'Abrir' })
    await user.click(disparador)

    const dialogo = screen.getByRole('dialog', { name: 'Desbloquear par' })
    expect(dialogo).toHaveAccessibleDescription('Confirme el motivo del desbloqueo.')
    expect(await axe(baseElement)).toHaveNoViolations()

    // Tab da vueltas dentro del diálogo
    for (let i = 0; i < 6; i++) {
      await user.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(disparador).toHaveFocus()
  })
})
