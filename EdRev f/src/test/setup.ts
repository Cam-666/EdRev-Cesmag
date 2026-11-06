import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import * as axeMatchers from 'vitest-axe/matchers'
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest'
import { reiniciarDb } from '@/mocks/db'
import { reiniciarEstadoAcceso } from '@/mocks/handlers/acceso'
import { server } from '@/mocks/server'

expect.extend(axeMatchers)

// Screens load data through the mock API: give async queries room before failing.
configure({ asyncUtilTimeout: 4000 })

// jsdom lacks these browser APIs, which Radix primitives (checkbox, select) rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
window.HTMLElement.prototype.scrollIntoView ??= () => {}
window.HTMLElement.prototype.hasPointerCapture ??= () => false
window.HTMLElement.prototype.releasePointerCapture ??= () => {}

// Node's fetch needs an absolute URL; MSW matches any host.
vi.stubEnv('VITE_API_URL', 'http://localhost/api')

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  reiniciarEstadoAcceso()
  reiniciarDb()
  window.sessionStorage.clear()
  window.localStorage.clear()
})
afterAll(() => server.close())
