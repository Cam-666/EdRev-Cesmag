/*
 * PantallaVacia — temporary placeholder for screens not built yet. Shows which phase builds it and
 * which requirements it must cover (traceability). Removed screen by screen as phases land.
 */
import { Alerta } from './Alerta'

export interface PantallaVaciaProps {
  titulo: string
  /** Build phase (1–7) in which this screen is implemented. */
  fase: number
  /** RF / RNF / HU identifiers from the v2 documents. */
  requisitos: string[]
  /** Use h2 when a parent layout already provides the page h1 (e.g. article sheet tabs). */
  encabezado?: 'h1' | 'h2'
}

export function PantallaVacia({ titulo, fase, requisitos, encabezado = 'h1' }: PantallaVaciaProps) {
  const Titulo = encabezado
  return (
    <section className="flex flex-col gap-4">
      <Titulo className="text-titulo-24">{titulo}</Titulo>
      <Alerta tipo="informacion" titulo={`Pantalla pendiente · fase ${fase}`}>
        Cubrirá: {requisitos.join(', ')}.
      </Alerta>
    </section>
  )
}
