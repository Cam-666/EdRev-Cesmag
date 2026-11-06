/** Active journal. The :revista URL segment is the only source of truth. */
export type Revista = 'reep' | 'ire'

export interface DatosRevista {
  id: Revista
  modulo: 1 | 2
  /** Full official name. */
  nombre: string
  /** Short name used in navigation. */
  nombreCorto: string
  issn: string
  /** Small label on the top bar (first line). */
  etiquetaBarra: string
  /** Title on the top bar (second line). */
  tituloBarra: string
}

export const REVISTAS: Record<Revista, DatosRevista> = {
  reep: {
    id: 'reep',
    modulo: 1,
    nombre: 'Revista Electrónica en Educación y Pedagogía',
    nombreCorto: 'Educación y Pedagogía',
    issn: '2590-7476',
    etiquetaBarra: 'Módulo 1 · Revista Electrónica en',
    tituloBarra: 'Educación y Pedagogía',
  },
  ire: {
    id: 'ire',
    modulo: 2,
    nombre: 'Revista Investigium IRE Ciencias Sociales y Humanas',
    nombreCorto: 'Investigium IRE',
    issn: '2357-5239',
    etiquetaBarra: 'Módulo 2 · Revista',
    tituloBarra: 'Investigium IRE · Ciencias Sociales y Humanas',
  },
}

export function esRevista(valor: string | undefined): valor is Revista {
  return valor === 'reep' || valor === 'ire'
}
