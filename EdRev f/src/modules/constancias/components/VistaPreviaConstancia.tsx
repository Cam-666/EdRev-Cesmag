/*
 * VistaPreviaConstancia — la constancia como se va a generar: la plantilla de constancia de la revista con sus
 * imágenes (membrete, diseño y firma), con el par, el artículo y la revista ya rellenados. No lleva consecutivo.
 */
import type { VistaConstancia } from '@/types/constancia'

export interface VistaPreviaConstanciaProps {
  vista: VistaConstancia
}

export function VistaPreviaConstancia({ vista }: VistaPreviaConstanciaProps) {
  const [titulo, ...resto] = vista.cuerpo.split('\n\n')
  return (
    <article
      aria-label="Vista previa de la constancia"
      className="flex flex-col items-center gap-4 rounded-lg border border-borde-fuerte bg-superficie-tarjeta p-6 text-center shadow-tarjeta"
    >
      <header>
        <p className="text-titulo-16 text-cesmag-rojo">{vista.universidad}</p>
        <p className="text-cuerpo-13 text-texto-secundario">{vista.revista}</p>
      </header>
      <p className="text-micro-11 uppercase text-texto-secundario">{titulo}</p>
      {resto.map((parrafo, i) => (
        <p key={i} className={i === 0 ? 'text-titulo-20' : 'text-cuerpo-15 text-texto-principal'}>
          {parrafo}
        </p>
      ))}
      <footer className="mt-2 border-t border-borde-base pt-3 text-cuerpo-13 text-texto-secundario">
        {vista.firma}
      </footer>
      <p className="text-cuerpo-13 text-texto-secundario">
        {vista.fondo ?? 'Sin encabezado, pie ni firma'}
      </p>
    </article>
  )
}
