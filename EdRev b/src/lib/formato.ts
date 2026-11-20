/*
 * formato — el formato sencillo del texto de una plantilla, que comparten el correo y el PDF de la constancia.
 * Los párrafos se separan con una línea en blanco. Un párrafo puede empezar con [centro], [justificado],
 * [derecha] o [izquierda] (a la izquierda si no tiene). **texto** es negrita. Un párrafo que es solo {{firma}}
 * se convierte en la imagen de la firma de la constancia. Así se guarda lo que la persona arma en el editor
 * de la página, que no le muestra estas marcas.
 */

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado'

export interface Tramo {
  texto: string
  negrita: boolean
}

export interface Parrafo {
  alineacion: Alineacion
  /** Líneas del párrafo (un salto de línea simple dentro del párrafo empieza una línea nueva). */
  lineas: Tramo[][]
  /** Verdadero para el párrafo que es solo la marca {{firma}}. */
  firma: boolean
}

const ALINEACIONES: Record<string, Alineacion> = {
  izquierda: 'izquierda',
  centro: 'centro',
  derecha: 'derecha',
  justificado: 'justificado',
}

export const MARCA_FIRMA = '{{firma}}'

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
    .map((bruto) => bruto.trim())
    .filter(Boolean)
    .map((bruto) => {
      const m = /^\[(izquierda|centro|derecha|justificado)\]\s*/.exec(bruto)
      const cuerpo = m ? bruto.slice(m[0].length) : bruto
      return {
        alineacion: m ? (ALINEACIONES[m[1] ?? ''] ?? 'izquierda') : 'izquierda',
        lineas: cuerpo.split('\n').map(tramos),
        firma: cuerpo.trim() === MARCA_FIRMA,
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
      const plano = p.lineas.map((l) => l.map((t) => t.texto).join('')).join('\n').trim()
      if (marca && plano === marca.marca) return marca.html
      const html = p.lineas
        .map((l) => l.map((t) => (t.negrita ? `<b>${escapar(t.texto)}</b>` : escapar(t.texto))).join(''))
        .join('<br>')
      const conMarca = marca ? html.replace(marca.marca, marca.html) : html
      return `<p style="margin:0 0 14px;text-align:${CSS_ALINEACION[p.alineacion]}">${conMarca}</p>`
    })
    .join('')
}
