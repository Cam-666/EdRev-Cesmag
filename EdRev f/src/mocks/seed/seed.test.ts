import { SEED_IRE } from './ire'
import { SEED_REEP } from './reep'
import type { SeedRevista } from './fabrica'
import type { EstadoArticulo } from '@/types/articulo'

const ESTADOS: EstadoArticulo[] = [
  'postulado',
  'en-revision',
  'en-evaluacion',
  'aprobado',
  'rechazado',
  'archivado',
]

describe.each([
  ['reep', SEED_REEP],
  ['ire', SEED_IRE],
] as Array<[string, SeedRevista]>)('seed %s', (prefijo, seed) => {
  it('has the requested volume', () => {
    expect(seed.articulos).toHaveLength(20)
    expect(seed.autores).toHaveLength(25)
    expect(seed.pares).toHaveLength(15)
  })

  it('shows every status badge at least once, with an archived article and a failed mail', () => {
    for (const estado of ESTADOS) {
      expect(seed.articulos.some((a) => a.estado === estado)).toBe(true)
    }
    expect(seed.correos.some((c) => c.estado === 'rebotado')).toBe(true)
    expect(seed.pares.some((p) => p.bloqueo)).toBe(true)
    expect(seed.constancias.some((c) => c.estado === 'pendiente')).toBe(true)
    expect(seed.constancias.some((c) => c.estado === 'emitida')).toBe(true)
  })

  it('keeps references consistent and inside the journal', () => {
    const autores = new Set(seed.autores.map((a) => a.id))
    const pares = new Set(seed.pares.map((p) => p.id))
    expect(autores.size).toBe(25)
    for (const a of seed.articulos) {
      expect(a.autoresIds.length).toBeGreaterThanOrEqual(1)
      expect(a.autoresIds.length).toBeLessThanOrEqual(7)
      a.autoresIds.forEach((id) => expect(autores.has(id)).toBe(true))
      expect(a.revista).toBe(prefijo)
    }
    for (const x of seed.asignaciones) {
      expect(pares.has(x.parId)).toBe(true)
      expect(seed.articulos.some((a) => a.id === x.articuloId)).toBe(true)
    }
    for (const a of seed.articulos) {
      expect(seed.asignaciones.filter((x) => x.articuloId === a.id).length).toBeLessThanOrEqual(3)
    }
    expect([...autores, ...pares].every((id) => id.startsWith(`${prefijo}-`))).toBe(true)
  })

  it('uses plausible Spanish content, no placeholders', () => {
    const texto = JSON.stringify(seed)
    expect(texto).not.toMatch(/lorem|ipsum|Usuario \d/i)
  })
})

describe('journal separation', () => {
  it('shares no author, peer or article record between REEP and IRE', () => {
    const ids = (s: SeedRevista) =>
      [...s.autores, ...s.pares, ...s.correos, ...s.auditoria].map((x) => x.id)
    const comunes = ids(SEED_REEP).filter((id) => ids(SEED_IRE).includes(id))
    expect(comunes).toEqual([])
    const titulosReep = new Set(SEED_REEP.articulos.map((a) => a.titulo))
    expect(SEED_IRE.articulos.some((a) => titulosReep.has(a.titulo))).toBe(false)
  })
})
