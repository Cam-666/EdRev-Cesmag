import { aNumero, conceptosContradictorios, superaUmbral } from './reglas'

describe('superaUmbral', () => {
  it('warns only strictly above 15 %', () => {
    expect(superaUmbral(15)).toBe(false)
    expect(superaUmbral(15.1)).toBe(true)
    expect(superaUmbral(21)).toBe(true)
    expect(superaUmbral(9)).toBe(false)
  })
})

describe('conceptosContradictorios', () => {
  it('flags publicable against no publicable, in either order', () => {
    expect(conceptosContradictorios('publicable', 'no-publicable')).toBe(true)
    expect(conceptosContradictorios('no-publicable', 'publicable')).toBe(true)
  })

  it('does not ask for a third peer when concepts agree or are not both registered', () => {
    expect(conceptosContradictorios('publicable', 'publicable')).toBe(false)
    expect(conceptosContradictorios('no-publicable', 'no-publicable')).toBe(false)
    expect(conceptosContradictorios('publicable', 'publicable-con-modificaciones')).toBe(false)
    expect(conceptosContradictorios('publicable', null)).toBe(false)
    expect(conceptosContradictorios(null, null)).toBe(false)
  })
})

describe('aNumero', () => {
  it('accepts a decimal comma', () => {
    expect(aNumero('12,5')).toBe(12.5)
    expect(aNumero(' 8 ')).toBe(8)
  })
})
