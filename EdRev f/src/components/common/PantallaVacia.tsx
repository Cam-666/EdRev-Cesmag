/*
 * PantallaVacia — marcador temporal para pantallas que aún no están construidas. Indica en qué fase se
 * construye y qué requisitos debe cubrir. Se retira pantalla por pantalla a medida que se construyen.
 */
import { Alerta } from './Alerta'

export interface PantallaVaciaProps {
  titulo: string
  /** Fase de construcción (1–7) en la que se implementa esta pantalla. */
  fase: number
  /** Identificadores de los documentos de requisitos. */
  requisitos: string[]
  /** Usar h2 cuando un marco superior ya da el h1 de la página (por ejemplo las pestañas de la ficha del artículo). */
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
