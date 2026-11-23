import { aGuardado, aVisible, datoVisible } from './datosPlantilla'

describe('datosPlantilla', () => {
  it('shows the markers with plain names and leaves other bracketed text alone', () => {
    expect(aVisible('Estimado(a) {{par}}, el artículo {{articulo}} de {{revista}}.')).toBe(
      'Estimado(a) [Nombre del par], el artículo [Título del artículo] de [Nombre de la revista].',
    )
    expect(aVisible('{{inventado}}')).toBe('{{inventado}}')
  })

  it('stores the names back as markers, whatever the text around them', () => {
    expect(aGuardado('Hola [Nombre del par]: «[Título del artículo]»')).toBe(
      'Hola {{par}}: «{{articulo}}»',
    )
    expect(aGuardado('Cita [como se dijo] y [Nombre del par]')).toBe(
      'Cita [como se dijo] y {{par}}',
    )
  })

  it('converts in both directions without loss', () => {
    const guardado = '[centro] **{{REVISTA}}**\n\n{{par}} · {{issn}} · {{firma}}'
    expect(aGuardado(aVisible(guardado))).toBe(guardado)
    expect(datoVisible('botones')).toBe('[Botones de respuesta]')
  })
})
