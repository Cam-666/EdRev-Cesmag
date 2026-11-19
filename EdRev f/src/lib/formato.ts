/*
 * formato — the light formatting of a template's text (same rules as the server): paragraphs
 * separated by a blank line; a paragraph may start with [centro], [justificado], [derecha] or
 * [izquierda]; **text** is bold. Used by the editor's buttons and by the preview.
 * Covers: RF-25, RF-30, RF-45.
 */

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado'

export const ALINEACIONES: Array<{ valor: Alineacion; etiqueta: string }> = [
  { valor: 'izquierda', etiqueta: 'Alinear a la izquierda' },
  { valor: 'centro', etiqueta: 'Centrar' },
  { valor: 'derecha', etiqueta: 'Alinear a la derecha' },
  { valor: 'justificado', etiqueta: 'Justificar' },
]

export interface Tramo {
  texto: string
  negrita: boolean
}

export interface Parrafo {
  alineacion: Alineacion
  lineas: Tramo[][]
}

const MARCA = /^\[(izquierda|centro|derecha|justificado)\]\s*/

function tramos(linea: string): Tramo[] {
  return linea
    .split('**')
    .map((texto, i) => ({ texto, negrita: i % 2 === 1 }))
    .filter((t) => t.texto !== '')
}

export function analizar(texto: string): Parrafo[] {
  return texto
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((bruto) => {
      const m = MARCA.exec(bruto)
      return {
        alineacion: (m?.[1] as Alineacion | undefined) ?? 'izquierda',
        lineas: (m ? bruto.slice(m[0].length) : bruto).split('\n').map(tramos),
      }
    })
}

/** The selected part of the text in bold; if it already is, the bold is removed. */
export function alternarNegrita(
  texto: string,
  inicio: number,
  fin: number,
): { texto: string; inicio: number; fin: number } {
  const antes = texto.slice(0, inicio)
  const medio = texto.slice(inicio, fin)
  const despues = texto.slice(fin)
  if (antes.endsWith('**') && despues.startsWith('**')) {
    return { texto: antes.slice(0, -2) + medio + despues.slice(2), inicio: inicio - 2, fin: fin - 2 }
  }
  if (medio.length > 4 && medio.startsWith('**') && medio.endsWith('**')) {
    return { texto: antes + medio.slice(2, -2) + despues, inicio, fin: fin - 4 }
  }
  return { texto: `${antes}**${medio}**${despues}`, inicio: inicio + 2, fin: fin + 2 }
}

/** Gives the paragraph where the cursor is the chosen alignment (left removes the mark). */
export function alinearParrafo(texto: string, posicion: number, alineacion: Alineacion): string {
  const normal = texto.replace(/\r\n/g, '\n')
  const separadores = [...normal.matchAll(/\n[ \t]*\n/g)]
  let inicio = 0
  let fin = normal.length
  for (const s of separadores) {
    const i = s.index ?? 0
    if (i + s[0].length <= posicion) inicio = i + s[0].length
    else if (i >= posicion) {
      fin = i
      break
    }
  }
  const parrafo = normal.slice(inicio, fin).replace(MARCA, '')
  const marca = alineacion === 'izquierda' ? '' : `[${alineacion}]`
  return normal.slice(0, inicio) + marca + parrafo + normal.slice(fin)
}

/** The text without the formatting marks, for places that cannot show them. */
export function textoPlano(texto: string): string {
  return analizar(texto)
    .map((p) => p.lineas.map((l) => l.map((t) => t.texto).join('')).join('\n'))
    .join('\n\n')
}
