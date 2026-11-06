import { puede } from './permisos'
import type { Accion } from './permisos'

const SOLO_ADMINISTRADOR: Accion[] = [
  'registrar-revision',
  'registrar-concepto',
  'marcar-entrega',
  'emitir-constancia',
  'desbloquear-par',
  'reabrir-articulo',
  'administrar',
]

describe('permisos', () => {
  it('administrador can do everything', () => {
    for (const a of [...SOLO_ADMINISTRADOR, 'registrar-datos', 'asignar-pares'] as Accion[]) {
      expect(puede('administrador', a)).toBe(true)
    }
  })

  it('auxiliar only registers and assigns', () => {
    expect(puede('auxiliar', 'registrar-datos')).toBe(true)
    expect(puede('auxiliar', 'asignar-pares')).toBe(true)
    for (const a of SOLO_ADMINISTRADOR) expect(puede('auxiliar', a)).toBe(false)
  })
})
