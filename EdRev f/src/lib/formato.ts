/*
 * formato — el formato sencillo del texto de una plantilla (las mismas reglas que el servidor): los párrafos se
 * separan con una línea en blanco; un párrafo puede empezar con [centro], [justificado], [derecha] o [izquierda];
 * **texto** es negrita y __texto__ cursiva; un párrafo vacío es un renglón en blanco. Así se guarda lo que arma el
 * editor, y lo usan los botones del editor y la vista previa.
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
  cursiva: boolean
}

export interface Parrafo {
  alineacion: Alineacion
  lineas: Tramo[][]
  /** Un renglón en blanco que la persona dejó entre dos párrafos. */
  vacio: boolean
}

const MARCA = /^\[(izquierda|centro|derecha|justificado)\]\s*/

/** Los trozos de una línea: ** alterna la negrita y __ la cursiva (pueden combinarse). */
function tramos(linea: string): Tramo[] {
  const res: Tramo[] = []
  let negrita = false
  let cursiva = false
  for (const parte of linea.split(/(\*\*|__)/)) {
    if (parte === '**') negrita = !negrita
    else if (parte === '__') cursiva = !cursiva
    else if (parte !== '') res.push({ texto: parte, negrita, cursiva })
  }
  return res
}

export function analizar(texto: string): Parrafo[] {
  // Se conserva la sangría del comienzo de cada línea (solo se quitan los saltos de línea de los bordes).
  const bloques = texto
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((p) => p.replace(/^\n+|\s+$/g, ''))
  // Los bloques vacíos del comienzo y del final no cuentan; los de en medio son renglones en blanco.
  let inicio = 0
  let fin = bloques.length
  while (inicio < fin && !bloques[inicio]?.trim()) inicio++
  while (fin > inicio && !bloques[fin - 1]?.trim()) fin--
  return bloques.slice(inicio, fin).map((bruto) => {
    if (!bruto.trim()) return { alineacion: 'izquierda' as Alineacion, lineas: [], vacio: true }
    const m = MARCA.exec(bruto.trimStart())
    return {
      alineacion: (m?.[1] as Alineacion | undefined) ?? 'izquierda',
      lineas: (m ? bruto.trimStart().slice(m[0].length) : bruto).split('\n').map(tramos),
      vacio: false,
    }
  })
}

/** La parte seleccionada del texto en negrita; si ya lo estaba, se quita la negrita. */
export function alternarNegrita(
  texto: string,
  inicio: number,
  fin: number,
): { texto: string; inicio: number; fin: number } {
  const antes = texto.slice(0, inicio)
  const medio = texto.slice(inicio, fin)
  const despues = texto.slice(fin)
  if (antes.endsWith('**') && despues.startsWith('**')) {
    return {
      texto: antes.slice(0, -2) + medio + despues.slice(2),
      inicio: inicio - 2,
      fin: fin - 2,
    }
  }
  if (medio.length > 4 && medio.startsWith('**') && medio.endsWith('**')) {
    return { texto: antes + medio.slice(2, -2) + despues, inicio, fin: fin - 4 }
  }
  return { texto: `${antes}**${medio}**${despues}`, inicio: inicio + 2, fin: fin + 2 }
}

/** Da al párrafo donde está el cursor la alineación elegida (izquierda quita la marca). */
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

/** El texto sin las marcas de formato, para los lugares que no pueden mostrarlas. */
export function textoPlano(texto: string): string {
  return analizar(texto)
    .map((p) => p.lineas.map((l) => l.map((t) => t.texto).join('')).join('\n'))
    .join('\n\n')
}
