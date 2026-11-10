import { validarPlantilla } from './plantillas'

const INVITACION = { id: 'invitacion' as const, variables: ['revista', 'par', 'articulo'] }
const CONSTANCIA = { id: 'constancia' as const, variables: ['nombrePar', 'articulo', 'revista'] }

describe('validarPlantilla (RNF-19)', () => {
  it('accepts a template that keeps its required markers', () => {
    expect(
      validarPlantilla(
        INVITACION,
        'Invitación · {{revista}}',
        'Apreciado(a) {{par}}: evalúe «{{articulo}}».',
      ),
    ).toBeNull()
  })

  it('refuses a marker the template does not have', () => {
    expect(validarPlantilla(INVITACION, null, '{{par}} {{articulo}} {{fecha}}')).toBe(
      'El marcador {{fecha}} no existe en esta plantilla.',
    )
    expect(validarPlantilla(INVITACION, 'Hola {{numero}}', '{{par}} {{articulo}}')).toContain(
      '{{numero}}',
    )
  })

  it('refuses a template that loses the peer or the article', () => {
    expect(validarPlantilla(INVITACION, null, 'Hola {{par}}')).toBe(
      'Falta el marcador obligatorio {{articulo}}.',
    )
  })

  it('the constancia must replace the peer name and the article title (RF-30)', () => {
    expect(
      validarPlantilla(
        CONSTANCIA,
        null,
        'HACE CONSTAR QUE {{nombrePar}} participó en «{{articulo}}».',
      ),
    ).toBeNull()
    expect(validarPlantilla(CONSTANCIA, null, 'HACE CONSTAR QUE {{nombrePar}}')).toContain(
      '{{articulo}}',
    )
    expect(
      validarPlantilla(CONSTANCIA, null, '{{nombrePar}} {{articulo}} {{numeroConstancia}}'),
    ).toContain('{{numeroConstancia}}')
  })

  it('refuses an empty text', () => {
    expect(validarPlantilla(INVITACION, null, '   ')).toBe('El texto no puede estar vacío.')
  })
})
