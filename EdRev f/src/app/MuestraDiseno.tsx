/*
 * MuestraDiseno — design system showcase (dev-only route /design-system, not part of the product).
 * Covers: RNF-11, RNF-12 (visual verification of states, contrast and focus).
 */
import { SeccionControles } from './muestra/SeccionControles'
import { SeccionDominio } from './muestra/SeccionDominio'
import { SeccionEstados } from './muestra/SeccionEstados'
import { SeccionNavegacion } from './muestra/SeccionNavegacion'
import { SeccionPanel } from './muestra/SeccionPanel'
import { SeccionTokens } from './muestra/SeccionTokens'

export function MuestraDiseno() {
  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-10 p-6">
      <h1 className="text-display">Sistema de diseño · CESMAG</h1>
      <SeccionTokens />
      <SeccionControles />
      <SeccionEstados />
      <SeccionNavegacion />
      <SeccionDominio />
      <SeccionPanel />
    </main>
  )
}
