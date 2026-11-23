import { redactarResumen } from './redaccion'
import type { Informe } from '@/types/panel'

const ind = (reep: number, ire: number) => ({ reep, ire, total: reep + ire })

const base: Informe = {
  periodo: '2026-1',
  etiquetaPeriodo: 'Primer semestre de 2026',
  revista: 'ambas',
  postulados: ind(5, 3),
  aprobados: ind(2, 1),
  rechazados: ind(1, 0),
  evaluacionesEntregadas: ind(4, 2),
  constanciasEmitidas: ind(3, 1),
  diasPromedioEvaluacion: ind(10, 20),
  conceptos: { publicable: 3, conModificaciones: 2, noPublicable: 1, pendienteFormato: 0 },
}

describe('executive summary of the report', () => {
  it('writes the figures of both journals in formal Spanish', () => {
    const texto = redactarResumen(base).join(' ')
    expect(texto).toContain('Durante el primer semestre de 2026, las dos revistas de la Universidad CESMAG registraron 8 artículos postulados')
    expect(texto).toContain('3 fueron aprobados y 1 fue rechazado')
    expect(texto).toContain('entregaron 6 evaluaciones y se emitieron 4 constancias')
    expect(texto).toContain('«Publicable», con 3 de 6 (50 %)')
  })

  it('speaks of a single journal in the singular and handles one unit', () => {
    const una = redactarResumen({
      ...base,
      revista: 'ire',
      postulados: ind(0, 1),
      aprobados: ind(0, 1),
      rechazados: ind(0, 0),
      evaluacionesEntregadas: ind(0, 1),
      constanciasEmitidas: ind(0, 1),
      diasPromedioEvaluacion: ind(0, 1),
      conceptos: { publicable: 1, conModificaciones: 0, noPublicable: 0, pendienteFormato: 0 },
    }).join(' ')
    expect(una).toContain('la Revista Investigium IRE: Ciencias Sociales y Humanas registró 1 artículo postulado')
    expect(una).toContain('1 fue aprobado y 0 fueron rechazados')
    expect(una).toContain('1 evaluación y se emitieron 1 constancia')
    expect(una).toContain('1 día')
  })

  it('says so when the period has no activity', () => {
    const vacio = redactarResumen({
      ...base,
      postulados: ind(0, 0),
      aprobados: ind(0, 0),
      rechazados: ind(0, 0),
      evaluacionesEntregadas: ind(0, 0),
      constanciasEmitidas: ind(0, 0),
      conceptos: { publicable: 0, conModificaciones: 0, noPublicable: 0, pendienteFormato: 0 },
    })
    expect(vacio).toEqual(['Durante el primer semestre de 2026 no hay actividad registrada para las dos revistas de la Universidad CESMAG.'])
  })
})
