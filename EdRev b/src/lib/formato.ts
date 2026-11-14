/*
 * formato — the light formatting of a template's text, shared by the mail and the constancia PDF.
 * Paragraphs are separated by a blank line. A paragraph may start with [centro], [justificado],
 * [derecha] or [izquierda] (left when absent). **text** is bold. A paragraph that is only
 * {{firma}} becomes the signature image of the constancia. The editor's buttons write this markup.
 */

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'justificado'

export interface Tramo {
  texto: string
  negrita: boolean
}

export interface Parrafo {
  alineacion: Alineacion
  /** Lines of the paragraph (a single line break inside it starts a new line). */
  lineas: Tramo[][]
  /** True for the paragraph that is only the {{firma}} marker. */
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

/** The text without the markup, for places that cannot show it. */
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
 * The text as HTML for the mail. A paragraph that is only `marca` (the buttons) is put as it is,
 * not wrapped in a paragraph, so the table of buttons stays valid HTML.
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
