import { resultadoDePares } from './resultadoPares'
import type { ConceptoPar, EstadoAsignacion } from '@/types/par'

const entrego = (concepto: ConceptoPar) => ({ estado: 'entrego' as EstadoAsignacion, concepto })
const enCurso = { estado: 'acepto' as EstadoAsignacion, concepto: null }
const rechazo = { estado: 'no-acepto' as EstadoAsignacion, concepto: null }

describe('resultadoDePares', () => {
  it('two peers with the same concept decide the article', () => {
    expect(resultadoDePares([entrego('no-publicable'), entrego('no-publicable')])).toBe(
      'no-publicable',
    )
    expect(
      resultadoDePares([
        entrego('publicable-con-modificaciones'),
        entrego('publicable-con-modificaciones'),
      ]),
    ).toBe('publicable-con-modificaciones')
    expect(resultadoDePares([entrego('publicable'), entrego('publicable')])).toBe('publicable')
  })

  it('waits while a peer has not delivered, or only one has a place', () => {
    expect(resultadoDePares([entrego('publicable'), enCurso])).toBeNull()
    expect(resultadoDePares([entrego('publicable')])).toBeNull()
  })

  it('a peer who declined holds no place and does not count', () => {
    expect(resultadoDePares([rechazo, rechazo, entrego('publicable')])).toBeNull()
    expect(resultadoDePares([rechazo, entrego('publicable'), entrego('publicable')])).toBe(
      'publicable',
    )
  })

  it('different concepts wait for the tiebreaker, who decides by majority', () => {
    expect(resultadoDePares([entrego('publicable'), entrego('no-publicable')])).toBeNull()
    expect(
      resultadoDePares([entrego('publicable'), entrego('no-publicable'), entrego('no-publicable')]),
    ).toBe('no-publicable')
    expect(
      resultadoDePares([
        entrego('publicable'),
        entrego('no-publicable'),
        entrego('publicable-con-modificaciones'),
      ]),
    ).toBeNull()
  })

  it('a pending-format concept decides nothing', () => {
    expect(
      resultadoDePares([entrego('pendiente-formato'), entrego('pendiente-formato')]),
    ).toBeNull()
  })
})
