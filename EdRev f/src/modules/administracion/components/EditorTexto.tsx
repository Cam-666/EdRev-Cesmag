/*
 * EditorTexto — the text of a template with a small bar: bold for the selected text and the
 * alignment of the paragraph (left, centered, right, justified). The formatting is written in the
 * text itself (see lib/formato), so the same text drives the mail and the constancia PDF.
 * Covers: RF-25, RF-30, RF-45, RNF-11.
 */
import { useRef } from 'react'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { alinearParrafo, alternarNegrita, ALINEACIONES } from '@/lib/formato'
import type { Alineacion } from '@/lib/formato'

export interface EditorTextoProps {
  valor: string
  onCambio: (texto: string) => void
  error?: string
  ayuda?: string
}

const ICONO: Record<Alineacion, string> = {
  izquierda: '⬅',
  centro: '↔',
  derecha: '➡',
  justificado: '☰',
}

export function EditorTexto({ valor, onCambio, error, ayuda }: EditorTextoProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

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
    const r = alternarNegrita(valor, inicio, fin)
    onCambio(r.texto)
    restaurar(r.inicio, r.fin)
  }

  function alinear(a: Alineacion) {
    const { inicio, fin } = seleccion()
    onCambio(alinearParrafo(valor, inicio, a))
    restaurar(inicio, fin)
  }

  return (
    <div className="flex flex-col gap-2">
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
      <AreaTexto
        ref={ref}
        etiqueta="Texto"
        rows={12}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        error={error}
        ayuda={ayuda}
      />
    </div>
  )
}
