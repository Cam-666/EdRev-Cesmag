import { mismaInstitucion } from './conflicto'

const AUTORES = [
  { nombre: 'Sandra Milena Córdoba', filiacion: 'Universidad de Nariño' },
  { nombre: 'Diego Fernando Erazo', filiacion: 'Universidad CESMAG' },
]

describe('mismaInstitucion (RF-17): the assignment is refused', () => {
  it('names the author whose institution is the peer own', () => {
    expect(mismaInstitucion({ universidad: 'Universidad CESMAG' }, AUTORES)).toBe(
      'El par pertenece a Universidad CESMAG, la misma institución del autor Diego Fernando Erazo: no se puede asignar a este artículo.',
    )
  })

  it('compares universities ignoring accents and case', () => {
    expect(mismaInstitucion({ universidad: 'UNIVERSIDAD DE NARINO' }, AUTORES)).toContain('Sandra Milena Córdoba')
  })

  it('is null for an unrelated university, an empty one or no authors', () => {
    expect(mismaInstitucion({ universidad: 'Universidad del Valle' }, AUTORES)).toBeNull()
    expect(mismaInstitucion({ universidad: '' }, AUTORES)).toBeNull()
    expect(mismaInstitucion({ universidad: 'Universidad CESMAG' }, [])).toBeNull()
  })
})
