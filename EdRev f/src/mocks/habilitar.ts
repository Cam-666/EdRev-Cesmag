/*
 * habilitarMocks — starts MSW in the browser while there is no backend. Turn it off with
 * VITE_USE_MOCKS=false once the real API exists: no component needs to change.
 */
export function mocksActivos(): boolean {
  return import.meta.env.VITE_USE_MOCKS !== 'false'
}

export async function habilitarMocks(): Promise<void> {
  if (!mocksActivos()) return
  const { worker } = await import('./browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}
