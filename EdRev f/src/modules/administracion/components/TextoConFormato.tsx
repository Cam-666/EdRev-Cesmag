/*
 * TextoConFormato — shows a template's text with its alignment and bold, as the mail or the
 * constancia will show it (preview). Covers: RF-25, RF-30, RF-45.
 */
import { analizar } from '@/lib/formato'
import type { Alineacion } from '@/lib/formato'

const CLASE: Record<Alineacion, string> = {
  izquierda: 'text-left',
  centro: 'text-center',
  derecha: 'text-right',
  justificado: 'text-justify',
}

export function TextoConFormato({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3 text-cuerpo-15">
      {analizar(texto).map((p, i) => (
        <p key={i} className={CLASE[p.alineacion]}>
          {p.lineas.map((linea, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {linea.map((t, k) => (t.negrita ? <strong key={k}>{t.texto}</strong> : t.texto))}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
