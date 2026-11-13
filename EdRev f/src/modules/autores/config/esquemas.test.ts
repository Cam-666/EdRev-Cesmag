import { esquemaAutor } from './esquemas'

const BASE = {
  nombre: 'Laura Rivera',
  correo: 'laura@udenar.edu.co',
  orcid: '',
  filiacion: 'Universidad de Nariño',
  pais: 'Colombia',
}

describe('esquemaAutor — ORCID is optional (RF-09)', () => {
  it('accepts an author without ORCID', () => {
    expect(esquemaAutor.safeParse(BASE).success).toBe(true)
  })

  it('accepts a well-formed ORCID, including the X check digit', () => {
    expect(esquemaAutor.safeParse({ ...BASE, orcid: '0000-0002-1825-0097' }).success).toBe(true)
    expect(esquemaAutor.safeParse({ ...BASE, orcid: '0000-0002-1694-233X' }).success).toBe(true)
  })

  it('still rejects an ORCID written in another format', () => {
    const r = esquemaAutor.safeParse({ ...BASE, orcid: '12345' })
    expect(r.success).toBe(false)
  })
})
