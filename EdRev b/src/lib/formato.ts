/*
 * formato — el formato sencillo del texto de una plantilla, que comparten el correo y el PDF de la constancia.
 * Los párrafos se separan con una línea en blanco. Un párrafo puede empezar con [centro], [justificado],
 * [derecha] o [izquierda] (a la izquierda si no tiene). **texto** es negrita y __texto__ es cursiva. Un párrafo
 * vacío (dos líneas en blanco seguidas) deja un renglón en blanco. Un párrafo que es solo {{firma}}
 * se convierte en la imagen de la firma de la constancia. Así se guarda lo que la persona arma en el editor
 * de la página, que no le muestra estas marcas.
 */

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado'

export interface Tramo {
  texto: string
  negrita: boolean
  cursiva: boolean
}

export interface Parrafo {
  alineacion: Alineacion
  /** Líneas del párrafo (un salto de línea simple dentro del párrafo empieza una línea nueva). */
  lineas: Tramo[][]
  /** Verdadero para el párrafo que es solo la marca {{firma}}. */
  firma: boolean
  /** Verdadero para un renglón en blanco que la persona dejó entre dos párrafos. */
  vacio: boolean
}

const ALINEACIONES: Record<string, Alineacion> = {
  izquierda: 'izquierda',
  centro: 'centro',
  derecha: 'derecha',
  justificado: 'justificado',
}

export const MARCA_FIRMA = '{{firma}}'

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
  const bloques = texto.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/).map((bruto) => bruto.replace(/^\n+|\s+$/g, ''))
  // Los bloques vacíos del comienzo y del final no cuentan; los de en medio son renglones en blanco.
  let inicio = 0
  let fin = bloques.length
  while (inicio < fin && !bloques[inicio]?.trim()) inicio++
  while (fin > inicio && !bloques[fin - 1]?.trim()) fin--
  return bloques.slice(inicio, fin).map((bruto) => {
    if (!bruto.trim()) return { alineacion: 'izquierda' as Alineacion, lineas: [], firma: false, vacio: true }
    const m = /^\[(izquierda|centro|derecha|justificado)\]\s*/.exec(bruto.trimStart())
    const cuerpo = m ? bruto.trimStart().slice(m[0].length) : bruto
    return {
      alineacion: m ? (ALINEACIONES[m[1] ?? ''] ?? 'izquierda') : 'izquierda',
      lineas: cuerpo.split('\n').map(tramos),
      firma: cuerpo.trim() === MARCA_FIRMA,
      vacio: false,
    }
  })
}

/** El texto sin las marcas, para los lugares que no pueden mostrarlas. */
export function textoPlano(texto: string): string {
  return analizar(texto)
    .map((p) => p.lineas.map((l) => l.map((t) => t.texto).join('')).join('\n'))
    .join('\n\n')
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const CSS_ALINEACION: Record<Alineacion, string> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
  justificado: 'justify',
}

/**
 * El texto como HTML para el correo. Un párrafo que es solo `marca` (los botones) se pone tal cual, sin
 * envolverlo en un párrafo, para que la tabla de botones siga siendo HTML válido.
 */
export function aHtml(texto: string, marca?: { marca: string; html: string }): string {
  return analizar(texto)
    .map((p) => {
      if (p.vacio) return '<p style="margin:0 0 14px">&nbsp;</p>'
      const plano = p.lineas.map((l) => l.map((t) => t.texto).join('')).join('\n').trim()
      if (marca && plano === marca.marca) return marca.html
      const html = p.lineas
        .map((l) =>
          l
            .map((t) => {
              const base = escapar(t.texto)
              const conCursiva = t.cursiva ? `<i>${base}</i>` : base
              return t.negrita ? `<b>${conCursiva}</b>` : conCursiva
            })
            .join(''),
        )
        .join('<br>')
      const conMarca = marca ? html.replace(marca.marca, marca.html) : html
      return `<p style="margin:0 0 14px;text-align:${CSS_ALINEACION[p.alineacion]}">${conMarca}</p>`
    })
    .join('')
}
