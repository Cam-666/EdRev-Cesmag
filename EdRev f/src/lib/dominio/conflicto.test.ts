import { detectarConflicto } from './conflicto'

const AUTORES = [
  { nombre: 'Sandra Milena Córdoba', filiacion: 'Universidad de Nariño' },
  { nombre: 'Diego Fernando Erazo', filiacion: 'Universidad CESMAG' },
]

describe('detectarConflicto (RF-17)', () => {
  it('warns when the peer shares university with an author, naming the author', () => {
    const c = detectarConflicto({ universidad: 'Universidad CESMAG' }, AUTORES)
    expect(c?.mensaje).toBe(
      'El par y el autor Diego Fernando Erazo pertenecen a Universidad CESMAG. Puede asignarlo de todos modos.',
    )
  })

  it('compares universities ignoring accents and case', () => {
    const c = detectarConflicto({ universidad: 'UNIVERSIDAD DE NARINO' }, AUTORES)
    expect(c?.mensaje).toContain('Sandra Milena Córdoba')
  })

  it('warns for any peer from Universidad CESMAG even if no author is from there', () => {
    const c = detectarConflicto({ universidad: 'Universidad CESMAG' }, AUTORES.slice(0, 1))
    expect(c?.mensaje).toBe(
      'El par pertenece a Universidad CESMAG. Puede asignarlo de todos modos.',
    )
  })

  it('does not warn for an unrelated university', () => {
    expect(detectarConflicto({ universidad: 'Universidad del Valle' }, AUTORES)).toBeNull()
  })

  it('without authors only the CESMAG rule applies', () => {
    expect(detectarConflicto({ universidad: 'Universidad del Valle' }, [])).toBeNull()
    expect(detectarConflicto({ universidad: 'Universidad CESMAG' }, [])).not.toBeNull()
  })
})
