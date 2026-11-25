import { csvInforme } from './exportar'
import type { Informe } from '@/types/panel'

const SALTO = String.fromCharCode(13, 10)

const ind = (reep: number, ire: number) => ({ reep, ire, total: reep + ire })

const informe: Informe = {
  periodo: '2026-2',
  etiquetaPeriodo: 'Segundo semestre de 2026',
  revista: 'ambas',
  postulados: ind(2, 1),
  aprobados: ind(1, 0),
  rechazados: ind(0, 1),
  evaluacionesEntregadas: ind(0, 0),
  constanciasEmitidas: ind(0, 0),
  diasPromedioEvaluacion: ind(0, 0),
  conceptos: { publicable: 0, conModificaciones: 0, noPublicable: 0, pendienteFormato: 0 },
  articulos: [
    {
      revista: 'reep',
      numeroOjs: '2026-034',
      titulo: 'Alfabetización mediática; un estudio',
      autores: 'Ana Pérez; Luis Gómez',
      publicacion: { volumen: 9, numero: 2 },
    },
    {
      revista: 'reep',
      numeroOjs: '2026-035',
      titulo: 'Otro',
      autores: 'Ana Pérez',
      publicacion: null,
    },
    { revista: 'ire', numeroOjs: '15', titulo: 'Tercero', autores: 'Sara Ruiz', publicacion: null },
  ],
  resultados: [
    { revista: 'reep', nombre: 'Revista REEP', publicados: 1, noPublicados: 1, rechazados: 0 },
    { revista: 'ire', nombre: 'Revista IRE', publicados: 0, noPublicados: 0, rechazados: 1 },
  ],
}

describe('Excel file of the report', () => {
  it('lists each article with OJS number, title, authors and volume/number when approved', () => {
    const lineas = csvInforme(informe).split(SALTO)
    expect(lineas).toContain('Revista;Número OJS;Nombre del artículo;Autor;Volumen y número')
    expect(lineas).toContain(
      'Educación y Pedagogía;2026-034;"Alfabetización mediática; un estudio";"Ana Pérez; Luis Gómez";Vol. 9 n.º 2',
    )
    expect(lineas).toContain('Educación y Pedagogía;2026-035;Otro;Ana Pérez;')
    expect(lineas).toContain('Investigium IRE;15;Tercero;Sara Ruiz;')
  })

  it('adds a second table with published, unpublished and rejected articles per journal and the total', () => {
    const lineas = csvInforme(informe).split(SALTO)
    expect(lineas).toContain('Revista;Publicados;No publicados;Rechazados;Total')
    expect(lineas).toContain('Revista REEP;1;1;0;2')
    expect(lineas).toContain('Revista IRE;0;0;1;1')
    expect(lineas).toContain('Total;1;1;1;3')
  })

  it('a single journal has no total row, and an empty period says so', () => {
    const una = csvInforme({
      ...informe,
      revista: 'ire',
      articulos: [],
      resultados: informe.resultados.slice(1),
    })
    expect(una).toContain('No hay artículos postulados en este periodo.')
    expect(una.split(SALTO)).not.toContain('Total;0;0;1;1')
  })
})
