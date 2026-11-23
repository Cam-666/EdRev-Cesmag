import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { EditorTexto } from './EditorTexto'

function Prueba({ inicial = '', alCambiar }: { inicial?: string; alCambiar: (t: string) => void }) {
  const [texto, setTexto] = useState(inicial)
  return (
    <EditorTexto
      valor={texto}
      onCambio={(t) => {
        setTexto(t)
        alCambiar(t)
      }}
      datos={['par', 'articulo']}
    />
  )
}

/** Selecciona de `inicio` a `fin` del primer texto del primer párrafo, como lo hace la persona con el ratón. */
function seleccionar(caja: HTMLElement, inicio: number, fin: number) {
  const texto = caja.querySelector('p')?.firstChild
  if (!texto) throw new Error('sin texto')
  const r = document.createRange()
  r.setStart(texto, inicio)
  r.setEnd(texto, fin)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(r)
}

describe('EditorTexto: the formatting is applied in the box, not written as marks', () => {
  it('shows the stored text formatted and never the marks', () => {
    render(<Prueba inicial={'[centro]**Constancia** de {{par}}'} alCambiar={() => undefined} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    expect(caja.textContent).toBe('Constancia de [Nombre del par]')
    expect(caja.querySelector('strong')?.textContent).toBe('Constancia')
    expect(caja.querySelector('p')).toHaveStyle({ textAlign: 'center' })
  })

  it('bold applies to the selected text and what is stored carries the mark', async () => {
    const cambios: string[] = []
    const user = userEvent.setup()
    render(<Prueba inicial="Hola mundo cruel" alCambiar={(t) => cambios.push(t)} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    seleccionar(caja, 5, 10)
    await user.click(screen.getByRole('button', { name: 'Negrita' }))
    expect(caja.querySelector('strong')?.textContent).toBe('mundo')
    expect(caja.textContent).toBe('Hola mundo cruel')
    expect(cambios.at(-1)).toBe('Hola **mundo** cruel')
    // y se quita de la misma manera
    seleccionar(caja, 0, 0)
    const fuerte = caja.querySelector('strong')?.firstChild
    const r = document.createRange()
    r.setStart(fuerte as Node, 0)
    r.setEnd(fuerte as Node, 5)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(r)
    await user.click(screen.getByRole('button', { name: 'Negrita' }))
    expect(caja.querySelector('strong')).toBeNull()
    expect(cambios.at(-1)).toBe('Hola mundo cruel')
  })

  it('the alignment applies to the paragraph where the cursor is', async () => {
    const cambios: string[] = []
    const user = userEvent.setup()
    render(<Prueba inicial={'Uno\n\nDos'} alCambiar={(t) => cambios.push(t)} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    const segundo = caja.querySelectorAll('p')[1]?.firstChild as Node
    const r = document.createRange()
    r.setStart(segundo, 1)
    r.collapse(true)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(r)
    await user.click(screen.getByRole('button', { name: /centr/i }))
    expect(caja.querySelectorAll('p')[1]).toHaveStyle({ textAlign: 'center' })
    expect(caja.querySelectorAll('p')[0]).not.toHaveStyle({ textAlign: 'center' })
    expect(caja.textContent).toBe('UnoDos')
    expect(cambios.at(-1)).toBe('Uno\n\n[centro]Dos')
  })

  it('justify is its own alignment: it is stored as such and its button shows pressed, not the left one', async () => {
    const cambios: string[] = []
    const user = userEvent.setup()
    render(<Prueba inicial="Un texto largo que se justifica" alCambiar={(t) => cambios.push(t)} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    expect(screen.getByRole('button', { name: 'Alinear a la izquierda' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    seleccionar(caja, 3, 3)
    await user.click(screen.getByRole('button', { name: 'Justificar' }))
    expect(caja.querySelector('p')).toHaveStyle({ textAlign: 'justify' })
    expect(cambios.at(-1)).toBe('[justificado]Un texto largo que se justifica')
    expect(screen.getByRole('button', { name: 'Justificar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Alinear a la izquierda' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(screen.getByRole('button', { name: 'Alinear a la izquierda' }))
    expect(cambios.at(-1)).toBe('Un texto largo que se justifica')
  })

  it('the data are inserted with a button and shown by plain names; what is stored is the marker', async () => {
    const cambios: string[] = []
    const user = userEvent.setup()
    render(<Prueba alCambiar={(t) => cambios.push(t)} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    expect(caja.textContent).toBe('')
    await user.click(screen.getByRole('button', { name: 'Nombre del par' }))
    expect(caja.textContent).toBe('[Nombre del par]')
    expect(cambios.at(-1)).toBe('{{par}}')
  })

  it('typing writes the text and an empty box is an empty text', async () => {
    const cambios: string[] = []
    const user = userEvent.setup()
    render(<Prueba alCambiar={(t) => cambios.push(t)} />)
    const caja = screen.getByRole('textbox', { name: 'Texto' })
    await user.click(caja)
    await user.type(caja, 'Apreciado(a) lector')
    expect(cambios.at(-1)).toBe('Apreciado(a) lector')
  })
})
