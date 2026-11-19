import { aHtmlEditable, deEditable } from './textoRico'

function caja(html: string): HTMLElement {
  const el = document.createElement('div')
  el.innerHTML = html
  return el
}

describe('texto rico del editor', () => {
  it('shows the stored text formatted: centered paragraph, bold and the data by plain names', () => {
    const html = aHtmlEditable('[centro]**Constancia** de {{par}}\n\nSegundo párrafo')
    expect(html).toContain('data-alineacion="centro"')
    expect(html).toContain('text-align:center')
    expect(html).toContain('<strong>Constancia</strong>')
    expect(html).toContain('[Nombre del par]')
    expect(html).not.toContain('{{')
    expect(html).not.toContain('[centro]')
    expect(html).not.toContain('**')
  })

  it('an empty text is a box with one empty paragraph', () => {
    expect(aHtmlEditable('')).toBe('<p data-alineacion="izquierda"><br></p>')
    expect(deEditable(caja(aHtmlEditable('')))).toBe('')
  })

  it('goes back to the stored text without loss', () => {
    for (const texto of [
      '[centro]**Constancia** de {{par}}\n\nSegundo párrafo',
      'Uno\ndos en otra línea\n\n[justificado]Tres con **negrita** al medio.\n\n[derecha]{{firma}}',
      '**{{PAR}}**\n\n[centro]{{articulo}}',
    ]) {
      expect(deEditable(caja(aHtmlEditable(texto)))).toBe(texto)
    }
  })

  it('reads what a browser writes when the person types: divs, b, loose text and the final br', () => {
    expect(deEditable(caja('<div>Uno</div><div>Dos<br></div>'))).toBe('Uno\n\nDos')
    expect(deEditable(caja('Texto suelto<div>Otro</div>'))).toBe('Texto suelto\n\nOtro')
    expect(deEditable(caja('<p>Hola <b>mundo</b> cruel</p>'))).toBe('Hola **mundo** cruel')
    expect(deEditable(caja('<p><strong>a</strong><strong>b</strong></p>'))).toBe('**a****b**'.replace('****', ''))
    expect(deEditable(caja('<p style="text-align:center">Hola</p>'))).toBe('[centro]Hola')
    expect(deEditable(caja('<p><br></p><p>Dos</p>'))).toBe('Dos')
  })

  it('does not let HTML written by the person through', () => {
    expect(aHtmlEditable('<b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;')
  })
})
