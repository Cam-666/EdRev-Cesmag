/*
 * EditorTexto — the text of a template in a box where it is seen as it will look: bold applies to
 * the selected text, the alignment (left, centered, right, justified) to the paragraph where the
 * cursor is, and the data the text can bring in (the name of the peer, the title of the article…)
 * are inserted with a button and shown with plain names between brackets. Nobody writes marks by
 * hand: the box is converted to the stored text (see lib/textoRico and lib/formato), so the same
 * text drives the mail and the constancia PDF. Covers: RF-25, RF-30, RF-45, RNF-11.
 */
import { useId, useLayoutEffect, useRef } from 'react'
import type { MouseEvent as EventoRaton } from 'react'
import { Boton } from '@/components/common/Boton'
import { MensajeError } from '@/components/common/MensajeError'
import { cn } from '@/lib/cn'
import { datoVisible, ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { ALINEACIONES } from '@/lib/formato'
import type { Alineacion } from '@/lib/formato'
import { aHtmlEditable, CSS_ALINEACION, deEditable } from '@/lib/textoRico'

export interface EditorTextoProps {
  /** The stored text (with {{markers}}, [centro] and **bold**); the editor shows it formatted. */
  valor: string
  onCambio: (texto: string) => void
  /** Keys of the data this template can bring in. */
  datos?: string[]
  error?: string
  ayuda?: string
}

const ICONO: Record<Alineacion, string> = {
  izquierda: '⬅',
  centro: '↔',
  derecha: '➡',
  justificado: '☰',
}

const esBloque = (n: Node) => n.nodeType === 1 && ['P', 'DIV'].includes((n as HTMLElement).tagName)

/** The buttons must not take the selection away from the text. */
const conservarSeleccion = (e: EventoRaton) => e.preventDefault()

const hayOrden = () => typeof document.execCommand === 'function'

export function EditorTexto({ valor, onCambio, datos = [], error, ayuda }: EditorTextoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const ultimo = useRef<string | null>(null)
  const idEtiqueta = useId()
  const idError = `${idEtiqueta}-error`
  const idAyuda = `${idEtiqueta}-ayuda`
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ')

  // The box is drawn from the stored text only when it changes from outside (not on every key).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && valor !== ultimo.current) {
      el.innerHTML = aHtmlEditable(valor)
      ultimo.current = valor
    }
  }, [valor])

  function emitir() {
    const el = ref.current
    if (!el) return
    const texto = deEditable(el)
    ultimo.current = texto
    onCambio(texto)
  }

  function rango(): Range | null {
    const sel = window.getSelection()
    if (!ref.current || !sel || sel.rangeCount === 0) return null
    const r = sel.getRangeAt(0)
    return ref.current.contains(r.commonAncestorContainer) ? r : null
  }

  function ponerSeleccion(r: Range) {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
  }

  /** Puts the focus in the box without losing what is selected in it. */
  function enfocar(el: HTMLElement) {
    const previa = rango()?.cloneRange()
    el.focus()
    if (previa) ponerSeleccion(previa)
  }

  /** Text typed straight into the box (outside a paragraph) goes into one, keeping the selection. */
  function envolverSueltos(el: HTMLElement) {
    const r = rango()
    const guardado = r ? { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset } : null
    let parrafo: HTMLElement | null = null
    for (const nodo of Array.from(el.childNodes)) {
      if (esBloque(nodo)) {
        parrafo = null
        continue
      }
      if (!parrafo) {
        parrafo = document.createElement('p')
        el.insertBefore(parrafo, nodo)
      }
      parrafo.appendChild(nodo)
    }
    if (el.childNodes.length === 0) el.innerHTML = '<p><br></p>'
    if (guardado && r) {
      try {
        r.setStart(guardado.sc, guardado.so)
        r.setEnd(guardado.ec, guardado.eo)
        ponerSeleccion(r)
      } catch {
        /* the selection stays where the browser put it */
      }
    }
  }

  function negrita() {
    const el = ref.current
    if (!el) return
    enfocar(el)
    if (hayOrden() && document.execCommand('bold')) {
      emitir()
      return
    }
    // Without the browser's command: wrap (or unwrap) the selected text by hand.
    const r = rango()
    if (!r || r.collapsed) return
    let dentro: Node | null = r.commonAncestorContainer
    while (dentro && dentro !== el && !(dentro.nodeType === 1 && (dentro as HTMLElement).tagName === 'STRONG')) {
      dentro = dentro.parentNode
    }
    if (dentro && dentro !== el) {
      const fuerte = dentro as HTMLElement
      while (fuerte.firstChild) fuerte.parentNode?.insertBefore(fuerte.firstChild, fuerte)
      fuerte.remove()
    } else {
      const fuerte = document.createElement('strong')
      fuerte.appendChild(r.extractContents())
      r.insertNode(fuerte)
    }
    emitir()
  }

  function alinear(a: Alineacion) {
    const el = ref.current
    if (!el) return
    enfocar(el)
    envolverSueltos(el)
    const r = rango()
    const bloques = Array.from(el.children).filter((h): h is HTMLElement => {
      if (!(h instanceof HTMLElement)) return false
      if (!r) return h === el.lastElementChild
      if (!r.intersectsNode(h)) return false
      // A selection that ends at the very start of the next paragraph does not include it.
      return r.collapsed || !(r.endContainer === h && r.endOffset === 0)
    })
    for (const b of bloques) {
      b.dataset.alineacion = a
      b.style.textAlign = CSS_ALINEACION[a]
    }
    emitir()
  }

  /** Puts `texto` where the cursor is (at the end when the box has no cursor). */
  function escribir(texto: string) {
    const el = ref.current
    if (!el) return
    enfocar(el)
    if (hayOrden() && document.execCommand('insertText', false, texto)) {
      emitir()
      return
    }
    let r = rango()
    if (!r) {
      envolverSueltos(el)
      const ultimoBloque = el.lastElementChild ?? el
      if (ultimoBloque.childNodes.length === 1 && ultimoBloque.firstChild?.nodeName === 'BR') {
        ultimoBloque.firstChild.remove()
      }
      r = document.createRange()
      r.selectNodeContents(ultimoBloque)
      r.collapse(false)
    }
    r.deleteContents()
    const fragmento = document.createDocumentFragment()
    texto.split(/\r?\n/).forEach((linea, i) => {
      if (i > 0) fragmento.appendChild(document.createElement('br'))
      fragmento.appendChild(document.createTextNode(linea))
    })
    const final = fragmento.lastChild
    r.insertNode(fragmento)
    if (final) r.setStartAfter(final)
    r.collapse(true)
    ponerSeleccion(r)
    emitir()
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="toolbar" aria-label="Formato del texto" className="flex flex-wrap gap-2">
        <Boton
          variante="neutro"
          tamano="sm"
          type="button"
          aria-label="Negrita"
          onMouseDown={conservarSeleccion}
          onClick={negrita}
        >
          <strong aria-hidden="true">N</strong>
        </Boton>
        {ALINEACIONES.map((a) => (
          <Boton
            key={a.valor}
            variante="neutro"
            tamano="sm"
            type="button"
            aria-label={a.etiqueta}
            onMouseDown={conservarSeleccion}
            onClick={() => alinear(a.valor)}
          >
            <span aria-hidden="true">{ICONO[a.valor]}</span>
          </Boton>
        ))}
      </div>
      {datos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id="insertar-dato" className="text-etiqueta-13">
            Insertar un dato en el texto
          </p>
          <p className="text-cuerpo-13 text-texto-secundario">
            Ubique el cursor donde desea el dato y presione el botón. Al enviar el correo, el
            sistema lo reemplaza por el dato real.
          </p>
          <div role="group" aria-labelledby="insertar-dato" className="flex flex-wrap gap-2">
            {datos.map((clave) => (
              <Boton
                key={clave}
                variante="secundario"
                tamano="sm"
                type="button"
                onMouseDown={conservarSeleccion}
                onClick={() => escribir(datoVisible(clave))}
              >
                {ETIQUETA_DATO[clave] ?? clave}
              </Boton>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span id={idEtiqueta} className="text-etiqueta-13 text-texto-principal">
          Texto
        </span>
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={idEtiqueta}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          contentEditable
          suppressContentEditableWarning
          tabIndex={0}
          spellCheck
          onInput={emitir}
          onFocus={() => {
            if (hayOrden()) document.execCommand('defaultParagraphSeparator', false, 'p')
          }}
          onPaste={(e) => {
            e.preventDefault()
            escribir(e.clipboardData.getData('text/plain'))
          }}
          className={cn(
            'min-h-64 rounded-md border bg-superficie-tarjeta px-3 py-2 text-cuerpo-15 text-texto-principal',
            'focus-visible:border-borde-foco [&_p]:mb-3 [&_p]:min-h-[1.5em]',
            error ? 'border-estado-error' : 'border-borde-control',
          )}
        />
        {ayuda && (
          <p id={idAyuda} className="text-cuerpo-13 text-texto-secundario">
            {ayuda}
          </p>
        )}
        {error && <MensajeError id={idError}>{error}</MensajeError>}
      </div>
    </div>
  )
}
