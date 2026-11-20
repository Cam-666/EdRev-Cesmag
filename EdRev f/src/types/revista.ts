/** Revista activa. El segmento :revista de la URL es la única fuente de verdad. */
export type Revista = 'reep' | 'ire'

export interface DatosRevista {
  id: Revista
  modulo: 1 | 2
  /** Nombre oficial completo. */
  nombre: string
  /** Nombre corto que se usa en la navegación. */
  nombreCorto: string
  issn: string
  /** Medio que se imprime junto al ISSN, como en el encabezado de la revista. */
  medioIssn: string
  /** Título compacto de la barra superior (pantallas angostas, donde el logo o el nombre en letras se oculta). */
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
