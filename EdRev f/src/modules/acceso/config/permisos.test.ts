import { puede } from './permisos'
import type { Accion } from './permisos'

const EDITORIALES: Accion[] = [
  'registrar-revision',
  'registrar-concepto',
  'marcar-entrega',
  'emitir-constancia',
  'bloquear-par',
  'desbloquear-par',
  'registrar-respuesta',
  'reabrir-articulo',
]

describe('permisos', () => {
  it('administrador can do everything', () => {
    for (const a of [
      ...EDITORIALES,
      'registrar-datos',
      'asignar-pares',
      'administrar',
    ] as Accion[]) {
      expect(puede('administrador', a)).toBe(true)
    }
  })

  it('auxiliar does all the editorial work but not administration', () => {
    for (const a of [...EDITORIALES, 'registrar-datos', 'asignar-pares'] as Accion[]) {
      expect(puede('auxiliar', a)).toBe(true)
    }
    expect(puede('auxiliar', 'administrar')).toBe(false)
  })
})
