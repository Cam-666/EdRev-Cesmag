/*
 * FondoAcceso — fondo compuesto de las pantallas de acceso, un solo componente reemplazable:
 * 1. foto aérea del campus de CESMAG (src/assets/fondo-cesmag.jpg),
 * 2. degradado institucional azul -> rojo con mezcla multiplicar al 90 %,
 * 3. oscurecimiento vertical para el contraste del texto.
 * Es puramente decorativo (aria-hidden).
 */
import fondo from '@/assets/fondo-cesmag.jpg'

export function FondoAcceso() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-neutro-800">
      <img src={fondo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-cesmag-azul to-cesmag-rojo opacity-90 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutro-900 opacity-60" />
    </div>
  )
}
