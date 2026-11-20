/*
 * textoRico — convierte el texto guardado de una plantilla (con [centro], **negrita** y {{marcas}}, ver
 * lib/formato) en lo que muestra el editor, y de vuelta. El editor es un recuadro donde el texto se ve como va
 * a quedar (centrado, en negrita…) y los datos aparecen con nombres sencillos entre corchetes, así nadie tiene
 * que escribir marcas a mano.
 */
import { aGuardado, aVisible } from './datosPlantilla'
import { analizar } from './formato'
import type { Alineacion } from './formato'

export const CSS_ALINEACION: Record<Alineacion, string> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
  justificado: 'justify',
}

const DE_CSS: Record<string, Alineacion> = {
  left: 'izquierda',
  start: 'izquierda',
  center: 'centro',
  right: 'derecha',
  end: 'derecha',
  justify: 'justificado',
}

const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** El texto guardado como el HTML que muestra el editor: un párrafo por bloque y la negrita en <strong>. */
export function aHtmlEditable(guardado: string): string {
  const parrafos = analizar(guardado)
  if (parrafos.length === 0) return '<p data-alineacion="izquierda"><br></p>'
  return parrafos
    .map((p) => {
      const html = p.lineas
        .map((linea) =>
          linea
            .map((t) => {
              const texto = escapar(aVisible(t.texto))
              return t.negrita ? `<strong>${texto}</strong>` : texto
            })
            .join(''),
        )
        .join('<br>')
      return `<p data-alineacion="${p.alineacion}" style="text-align:${CSS_ALINEACION[p.alineacion]}">${html}</p>`
    })
    .join('')
}

const BLOQUES = new Set(['P', 'DIV'])

function esNegrita(e: HTMLElement): boolean {
  if (e.tagName === 'STRONG' || e.tagName === 'B') return true
  const peso = e.style.fontWeight
  return peso === 'bold' || peso === 'bolder' || Number(peso) >= 600
}

/** El texto de un nodo tal como se guarda: la negrita entre **, los saltos de línea como \n. */
function enLinea(nodo: Node): string {
  let s = ''
  nodo.childNodes.forEach((hijo) => {
    if (hijo.nodeType === 3) {
      s += hijo.textContent ?? ''
    } else if (hijo.nodeType === 1) {
      const e = hijo as HTMLElement
      if (e.tagName === 'BR') s += '\n'
      else {
        const dentro = enLinea(e)
        const bloque = BLOQUES.has(e.tagName)
        const texto = esNegrita(e) && dentro.trim() !== '' ? `**${dentro}**` : dentro
        s += bloque ? `\n${texto}\n` : texto
      }
    }
  })
  return s
}

/** La alineación que tiene un párrafo del recuadro (a la izquierda si no tiene). */
export function alineacionDe(e: HTMLElement): Alineacion {
  const dicha = e.dataset.alineacion
  if (dicha === 'centro' || dicha === 'derecha' || dicha === 'justificado' || dicha === 'izquierda') return dicha
  return DE_CSS[e.style.textAlign] ?? 'izquierda'
}

function parrafoGuardado(texto: string, alineacion: Alineacion): string | null {
  const limpio = texto
    .replace(/\u00a0/g, ' ')
    .replace(/\*\*\*\*/g, '')
    .replace(/^\n+|\n+$/g, '')
    .replace(/\n{2,}/g, '\n')
  if (limpio.trim() === '') return null
  return alineacion === 'izquierda' ? limpio : `[${alineacion}]${limpio}`
}

/** Lo que muestra el editor, como texto guardado: [centro], **negrita** y {{marcas}}. */
export function deEditable(raiz: HTMLElement): string {
  const parrafos: string[] = []
  let suelto = ''
  const cerrarSuelto = () => {
    const p = parrafoGuardado(suelto, 'izquierda')
    if (p) parrafos.push(p)
    suelto = ''
  }
  raiz.childNodes.forEach((nodo) => {
    if (nodo.nodeType === 1 && BLOQUES.has((nodo as HTMLElement).tagName)) {
      cerrarSuelto()
      const e = nodo as HTMLElement
      const p = parrafoGuardado(enLinea(e), alineacionDe(e))
      if (p) parrafos.push(p)
    } else if (nodo.nodeType === 3) {
      suelto += nodo.textContent ?? ''
    } else if (nodo.nodeType === 1) {
      const e = nodo as HTMLElement
      if (e.tagName === 'BR') suelto += '\n'
      else suelto += esNegrita(e) ? `**${enLinea(e)}**` : enLinea(e)
    }
  })
  cerrarSuelto()
  return aGuardado(parrafos.join('\n\n'))
}
