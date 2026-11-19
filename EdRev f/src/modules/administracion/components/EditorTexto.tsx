/*
 * EditorTexto — the text of a template with a small bar: bold for the selected text, the alignment
 * of the paragraph (left, centered, right, justified) and the data the text can bring in (the name
 * of the peer, the title of the article…), which are inserted with a button and shown with plain
 * names between «», so nobody has to write markers by hand. The formatting is written in the text
 * itself (see lib/formato), so the same text drives the mail and the constancia PDF.
 * Covers: RF-25, RF-30, RF-45, RNF-11.
 */
import { useRef } from 'react'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { aGuardado, aVisible, datoVisible, ETIQUETA_DATO } from '@/lib/datosPlantilla'
import { alinearParrafo, alternarNegrita, ALINEACIONES } from '@/lib/formato'
import type { Alineacion } from '@/lib/formato'

export interface EditorTextoProps {
  /** The stored text (with {{markers}}); the editor shows it with plain names. */
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

export function EditorTexto({ valor, onCambio, datos = [], error, ayuda }: EditorTextoProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const visible = aVisible(valor)

  function seleccion() {
    const t = ref.current
    return { inicio: t?.selectionStart ?? 0, fin: t?.selectionEnd ?? 0 }
  }

  function restaurar(inicio: number, fin: number) {
    // The textarea re-renders with the new text first; then the selection is put back.
    setTimeout(() => {
      ref.current?.focus()
      ref.current?.setSelectionRange(inicio, fin)
    })
  }

  function negrita() {
    const { inicio, fin } = seleccion()
    if (inicio === fin) {
      ref.current?.focus()
      return
    }
    const r = alternarNegrita(visible, inicio, fin)
    onCambio(aGuardado(r.texto))
    restaurar(r.inicio, r.fin)
  }

  function alinear(a: Alineacion) {
    const { inicio, fin } = seleccion()
    onCambio(aGuardado(alinearParrafo(visible, inicio, a)))
    restaurar(inicio, fin)
  }

  function insertar(clave: string) {
    const { inicio, fin } = seleccion()
    const dato = datoVisible(clave)
    onCambio(aGuardado(visible.slice(0, inicio) + dato + visible.slice(fin)))
    restaurar(inicio + dato.length, inicio + dato.length)
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="toolbar" aria-label="Formato del texto" className="flex flex-wrap gap-2">
        <Boton
          variante="neutro"
          tamano="sm"
          type="button"
          aria-label="Negrita (selecciona antes el texto)"
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
                onClick={() => insertar(clave)}
              >
                {ETIQUETA_DATO[clave] ?? clave}
              </Boton>
            ))}
          </div>
        </div>
      )}
      <AreaTexto
        ref={ref}
        etiqueta="Texto"
        rows={12}
        value={visible}
        onChange={(e) => onCambio(aGuardado(e.target.value))}
        error={error}
        ayuda={ayuda}
      />
    </div>
  )
}
