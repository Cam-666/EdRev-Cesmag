/*
 * FondoAcceso — composite background of the access screens, a single replaceable component:
 *   1. aerial photo of the CESMAG campus (src/assets/fondo-cesmag.jpg),
 *   2. institutional gradient blue -> red in multiply blend at 90 %,
 *   3. vertical darkening for text contrast.
 * Purely decorative (aria-hidden). Covers: HU-28 (access screens).
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
