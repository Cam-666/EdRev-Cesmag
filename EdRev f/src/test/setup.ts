import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import { reiniciarDb } from '@/mocks/db'
import { reiniciarEstadoAcceso } from '@/mocks/handlers/acceso'
import { server } from '@/mocks/server'

expect.extend(axeMatchers)

// Las pantallas cargan datos con la API simulada: se da margen a las consultas asíncronas antes de fallar.
configure({ asyncUtilTimeout: 4000 })

// jsdom no trae estas APIs del navegador, que necesitan los componentes de Radix (casilla, select).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
// Los archivos de pruebas solo de API pueden correr en Node (por ejemplo subidas multipart), donde no hay window.
const enNavegador = typeof window !== 'undefined'
if (enNavegador) {
  window.HTMLElement.prototype.scrollIntoView ??= () => {}
  window.HTMLElement.prototype.hasPointerCapture ??= () => false
  window.HTMLElement.prototype.releasePointerCapture ??= () => {}
}

// El fetch de Node necesita una URL absoluta; MSW responde para cualquier servidor.
vi.stubEnv('VITE_API_URL', 'http://localhost/api')

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  reiniciarEstadoAcceso()
  reiniciarDb()
  if (enNavegador) {
    window.sessionStorage.clear()
    window.localStorage.clear()
  }
})
afterAll(() => server.close())
