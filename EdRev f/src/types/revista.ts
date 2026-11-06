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
  /** Medium printed next to the ISSN, as in the journal header. */
  medioIssn: string
  /** Compact title of the top bar (narrow screens, where the logo or wordmark is hidden). */
  tituloBarra: string
}

export const REVISTAS: Record<Revista, DatosRevista> = {
  reep: {
    id: 'reep',
    modulo: 1,
    nombre: 'Revista Electrónica en Educación y Pedagogía',
    nombreCorto: 'Educación y Pedagogía',
    issn: '2590-7476',
    medioIssn: 'En línea',
    tituloBarra: 'Educación y Pedagogía',
  },
  ire: {
    id: 'ire',
    modulo: 2,
    nombre: 'Revista Investigium IRE Ciencias Sociales y Humanas',
    nombreCorto: 'Investigium IRE',
    issn: '2357-5239',
    medioIssn: 'Digital',
    tituloBarra: 'Investigium IRE · Ciencias Sociales y Humanas',
  },
}

export function esRevista(valor: string | undefined): valor is Revista {
  return valor === 'reep' || valor === 'ire'
}
