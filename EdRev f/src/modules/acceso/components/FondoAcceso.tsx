/*
 * FondoAcceso — composite background of the access screens, a single replaceable component:
 *   1. aerial photo of the campus (PLACEHOLDER: swap the first layer for the real <img>),
 *   2. institutional gradient blue -> red in multiply blend at 90 %,
 *   3. vertical darkening for text contrast.
 * Purely decorative (aria-hidden). Covers: HU-28 (access screens).
 */
export function FondoAcceso() {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-neutro-800">
      {/* PLACEHOLDER for the aerial campus photograph. */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutro-300 via-neutro-400 to-neutro-600" />
      <div className="absolute inset-0 bg-gradient-to-br from-cesmag-azul to-cesmag-rojo opacity-90 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutro-900 opacity-60" />
    </div>
  )
}
