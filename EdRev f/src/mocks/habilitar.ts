/*
 * habilitarMocks — arranca MSW en el navegador mientras no hay backend. Se apaga con VITE_USE_MOCKS=false cuando
 * existe la API real: ningún componente cambia.
 */
export function mocksActivos(): boolean {
  return import.meta.env.VITE_USE_MOCKS !== 'false'
}

export async function habilitarMocks(): Promise<void> {
  if (!mocksActivos()) return
  const { worker } = await import('./browser')
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
}
