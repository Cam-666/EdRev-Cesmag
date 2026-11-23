import { alinearParrafo, alternarNegrita, analizar, textoPlano } from './formato'

describe('formato del texto de una plantilla', () => {
  it('reads the alignment of each paragraph and the bold', () => {
    const p = analizar(
      '[centro]**Título**\n\n[justificado]Texto con **negrita** en medio.\n\nSin marca',
    )
    expect(p.map((x) => x.alineacion)).toEqual(['centro', 'justificado', 'izquierda'])
    expect(p[1]?.lineas[0]?.map((t) => t.negrita)).toEqual([false, true, false])
    expect(textoPlano('[centro]**A** b\nc')).toBe('A b\nc')
  })

  it('puts the selected text in bold and takes it out again', () => {
    const a = alternarNegrita('Hola mundo cruel', 5, 10)
    expect(a.texto).toBe('Hola **mundo** cruel')
    expect(a.texto.slice(a.inicio, a.fin)).toBe('mundo')
    const b = alternarNegrita(a.texto, a.inicio, a.fin)
    expect(b.texto).toBe('Hola mundo cruel')
  })

  it('aligns only the paragraph where the cursor is, and left removes the mark', () => {
    const texto = 'Uno\n\nDos\n\nTres'
    const centrado = alinearParrafo(texto, 6, 'centro') // inside «Dos»
    expect(centrado).toBe('Uno\n\n[centro]Dos\n\nTres')
    expect(alinearParrafo(centrado, 10, 'justificado')).toBe('Uno\n\n[justificado]Dos\n\nTres')
    expect(alinearParrafo(centrado, 10, 'izquierda')).toBe('Uno\n\nDos\n\nTres')
    expect(alinearParrafo(texto, 0, 'derecha')).toBe('[derecha]Uno\n\nDos\n\nTres')
    expect(alinearParrafo(texto, texto.length, 'centro')).toBe('Uno\n\nDos\n\n[centro]Tres')
  })
})
