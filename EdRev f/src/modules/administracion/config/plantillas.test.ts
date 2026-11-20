import { validarPlantilla } from './plantillas'

const INVITACION = { variables: ['revista', 'par', 'articulo'] }
const CONSTANCIA = { variables: ['revista', 'par', 'articulo'] }

describe('validarPlantilla', () => {
  it('accepts a template that uses its own markers', () => {
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
      'El dato «Fecha de emisión» no se puede usar en esta plantilla.',
    )
    expect(validarPlantilla(INVITACION, 'Hola {{numero}}', '{{par}} {{articulo}}')).toContain(
      'Número de la solicitud',
    )
  })

  it('no marker is mandatory: a new template can be written freely', () => {
    expect(validarPlantilla(INVITACION, null, 'Hola {{par}}')).toBeNull()
    expect(validarPlantilla(INVITACION, null, 'Un texto sin marcadores.')).toBeNull()
    expect(validarPlantilla(INVITACION, null, '   ')).toBe('El texto no puede estar vacío.')
  })

  it('the constancia accepts its markers and refuses the unknown ones', () => {
    expect(
      validarPlantilla(CONSTANCIA, null, 'HACE CONSTAR QUE {{par}} participó en «{{articulo}}».'),
    ).toBeNull()
    expect(
      validarPlantilla(CONSTANCIA, null, '{{par}} {{articulo}} {{numeroConstancia}}'),
    ).toContain('numeroConstancia')
  })

  it('refuses an empty text', () => {
    expect(validarPlantilla(INVITACION, null, '   ')).toBe('El texto no puede estar vacío.')
  })
})
