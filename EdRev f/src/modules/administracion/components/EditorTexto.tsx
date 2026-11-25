/*
 * EditorTexto — el texto de una plantilla en un recuadro donde se ve como va a quedar: la negrita y la cursiva se
 * aplican al texto seleccionado, la alineación (izquierda, centro, derecha, justificado) al párrafo donde está el cursor, y
 * los datos que el texto puede traer (el nombre del par, el título del artículo…) se insertan con un botón y se
 * muestran con nombres sencillos entre corchetes. Nadie escribe marcas a mano: el recuadro se convierte en el
 * texto guardado (ver lib/textoRico y lib/formato), así el mismo texto sirve para el correo y para el PDF de la
 * constancia. Si el correo tiene asunto, el campo del asunto va aquí mismo y los botones de datos escriben donde
 * esté el cursor: en el asunto o en el texto.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as EventoRaton } from 'react'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { MensajeError } from '@/components/common/MensajeError'
import { cn } from '@/lib/cn'
import { aGuardado, aVisible, datoVisible, ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { ALINEACIONES } from '@/lib/formato'
import type { Alineacion } from '@/lib/formato'
import { alineacionDe, aHtmlEditable, CSS_ALINEACION, deEditable } from '@/lib/textoRico'

export interface EditorTextoProps {
  /** El texto guardado (con {{marcas}}, [centro] y **negrita**); el editor lo muestra con su formato. */
  valor: string
  onCambio: (texto: string) => void
  /** Claves de los datos que esta plantilla puede traer. */
  datos?: string[]
  error?: string
  ayuda?: string
  /** El asunto guardado (con {{marcas}}), si el correo lleva asunto; sin él no se muestra el campo. */
  asunto?: string
  onAsunto?: (asunto: string) => void
}

/** Datos que solo tienen sentido en el cuerpo (no en el asunto de un correo). */
const SOLO_EN_TEXTO = ['botones', 'firma']

const ICONO: Record<Alineacion, string> = {
  izquierda: '⬅',
  centro: '↔',
  derecha: '➡',
  justificado: '☰',
}

const esBloque = (n: Node) => n.nodeType === 1 && ['P', 'DIV'].includes((n as HTMLElement).tagName)

/** Los botones no deben quitarle la selección al texto. */
const conservarSeleccion = (e: EventoRaton) => e.preventDefault()

const hayOrden = () => typeof document.execCommand === 'function'

export function EditorTexto({
  valor,
  onCambio,
  datos = [],
  error,
  ayuda,
  asunto,
  onAsunto,
}: EditorTextoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const refAsunto = useRef<HTMLInputElement>(null)
  const tieneAsunto = asunto !== undefined && onAsunto !== undefined
  // Dónde escriben los botones de datos: en el último campo donde estuvo el cursor.
  const [destino, setDestino] = useState<'asunto' | 'texto'>('texto')
  const enAsunto = tieneAsunto && destino === 'asunto'
  const ultimo = useRef<string | null>(null)
  const idEtiqueta = useId()
  // La alineación del párrafo donde está el cursor, para que el botón de la que está en uso se vea presionado.
  const [activa, setActiva] = useState<Alineacion>('izquierda')
  const idError = `${idEtiqueta}-error`
  const idAyuda = `${idEtiqueta}-ayuda`
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(' ')

  // El recuadro se dibuja a partir del texto guardado solo cuando este cambia desde fuera (no en cada tecla).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && valor !== ultimo.current) {
      el.innerHTML = aHtmlEditable(valor)
      ultimo.current = valor
    }
  }, [valor])

  useEffect(() => {
    function seguir() {
      const el = ref.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return
      let nodo: Node | null = sel.anchorNode
      while (nodo && nodo.parentNode !== el) nodo = nodo.parentNode
      if (nodo instanceof HTMLElement) setActiva(alineacionDe(nodo))
    }
    document.addEventListener('selectionchange', seguir)
    return () => document.removeEventListener('selectionchange', seguir)
  }, [])

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

  /** Pone el foco en el recuadro sin perder lo que está seleccionado en él. */
  function enfocar(el: HTMLElement) {
    const previa = rango()?.cloneRange()
    el.focus()
    if (previa) ponerSeleccion(previa)
  }

  /** El texto escrito directamente en el recuadro (fuera de un párrafo) pasa a un párrafo, conservando la selección. */
  function envolverSueltos(el: HTMLElement) {
    const r = rango()
    const guardado = r
      ? { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset }
      : null
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
        /* la selección queda donde la puso el navegador */
      }
    }
  }

  /** Negrita o cursiva sobre el texto seleccionado (si ya la tiene, se quita). */
  function estilo(orden: 'bold' | 'italic') {
    const el = ref.current
    if (!el) return
    enfocar(el)
    if (hayOrden() && document.execCommand(orden)) {
      emitir()
      return
    }
    // Sin el comando del navegador: se envuelve (o desenvuelve) a mano el texto seleccionado.
    const etiqueta = orden === 'bold' ? 'STRONG' : 'EM'
    const r = rango()
    if (!r || r.collapsed) return
    let dentro: Node | null = r.commonAncestorContainer
    while (
      dentro &&
      dentro !== el &&
      !(dentro.nodeType === 1 && (dentro as HTMLElement).tagName === etiqueta)
    ) {
      dentro = dentro.parentNode
    }
    if (dentro && dentro !== el) {
      const envoltura = dentro as HTMLElement
      while (envoltura.firstChild)
        envoltura.parentNode?.insertBefore(envoltura.firstChild, envoltura)
      envoltura.remove()
    } else {
      const envoltura = document.createElement(etiqueta.toLowerCase())
      envoltura.appendChild(r.extractContents())
      r.insertNode(envoltura)
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
      // Una selección que termina justo al inicio del párrafo siguiente no lo incluye.
      return r.collapsed || !(r.endContainer === h && r.endOffset === 0)
    })
    for (const b of bloques) {
      b.dataset.alineacion = a
      b.style.textAlign = CSS_ALINEACION[a]
    }
    setActiva(a)
    emitir()
  }

  /** Escribe un dato en el asunto, donde está el cursor (o al final), y deja el cursor después del dato. */
  function escribirEnAsunto(dato: string) {
    const campo = refAsunto.current
    if (!campo || !tieneAsunto) return
    const visible = aVisible(asunto)
    const inicio = campo.selectionStart ?? visible.length
    const fin = campo.selectionEnd ?? inicio
    onAsunto(aGuardado(visible.slice(0, inicio) + dato + visible.slice(fin)))
    const cursor = inicio + dato.length
    requestAnimationFrame(() => {
      campo.focus()
      campo.setSelectionRange(cursor, cursor)
    })
  }

  /** Escribe `texto` donde está el cursor (al final cuando el recuadro no tiene cursor). */
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
      {tieneAsunto && (
        <CampoTexto
          ref={refAsunto}
          etiqueta="Asunto"
          value={aVisible(asunto)}
          onChange={(e) => onAsunto(aGuardado(e.target.value))}
          onFocus={() => setDestino('asunto')}
        />
      )}
      {datos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p id="insertar-dato" className="text-etiqueta-13">
            {tieneAsunto
              ? `Insertar un dato en ${enAsunto ? 'el asunto' : 'el texto'}`
              : 'Insertar un dato en el texto'}
          </p>
          <p className="text-cuerpo-13 text-texto-secundario">
            {tieneAsunto
              ? 'Ubique el cursor en el asunto o en el texto, donde desea el dato, y presione el botón. Al enviar el correo, el sistema lo reemplaza por el dato real.'
              : 'Ubique el cursor donde desea el dato y presione el botón. Al enviar el correo, el sistema lo reemplaza por el dato real.'}
          </p>
          <div role="group" aria-labelledby="insertar-dato" className="flex flex-wrap gap-2">
            {datos.map((clave) => (
              <Boton
                key={clave}
                variante="secundario"
                tamano="sm"
                type="button"
                onMouseDown={conservarSeleccion}
                disabled={enAsunto && SOLO_EN_TEXTO.includes(clave)}
                onClick={() =>
                  enAsunto ? escribirEnAsunto(datoVisible(clave)) : escribir(datoVisible(clave))
                }
              >
                {ETIQUETA_DATO[clave] ?? clave}
              </Boton>
            ))}
          </div>
        </div>
      )}
      <div role="toolbar" aria-label="Formato del texto" className="flex flex-wrap gap-2">
        <Boton
          variante="neutro"
          tamano="sm"
          type="button"
          aria-label="Negrita"
          onMouseDown={conservarSeleccion}
          onClick={() => estilo('bold')}
        >
          <strong aria-hidden="true">N</strong>
        </Boton>
        <Boton
          variante="neutro"
          tamano="sm"
          type="button"
          aria-label="Cursiva"
          onMouseDown={conservarSeleccion}
          onClick={() => estilo('italic')}
        >
          <em aria-hidden="true" className="font-serif">
            K
          </em>
        </Boton>
        {ALINEACIONES.map((a) => (
          <Boton
            key={a.valor}
            variante={activa === a.valor ? 'secundario' : 'neutro'}
            tamano="sm"
            type="button"
            aria-label={a.etiqueta}
            aria-pressed={activa === a.valor}
            onMouseDown={conservarSeleccion}
            onClick={() => alinear(a.valor)}
          >
            <span aria-hidden="true">{ICONO[a.valor]}</span>
          </Boton>
        ))}
      </div>
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
            setDestino('texto')
            if (hayOrden()) document.execCommand('defaultParagraphSeparator', false, 'p')
          }}
          onPaste={(e) => {
            e.preventDefault()
            escribir(e.clipboardData.getData('text/plain'))
          }}
          className={cn(
            'min-h-64 max-w-xl rounded-md border bg-superficie-tarjeta px-3 py-2 text-cuerpo-15 text-texto-principal',
            'whitespace-pre-wrap focus-visible:border-borde-foco [&_p]:mb-3 [&_p]:min-h-[1.5em]',
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
