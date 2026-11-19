/*
 * Migrated records to correct (RF-42..RF-44, HU-32): what the Excel brought that does not fit the
 * closed lists is listed per journal and corrected from the interface.
 */
import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { ArticuloDetalle } from '@/types/articulo'
import type { HistorialArticulo } from '@/types/historial'
import type { RegistroPorCorregir } from '@/types/migracion'
import type { ResumenGeneral, Tablero } from '@/types/panel'

const lista = async (revista: 'reep' | 'ire') =>
  json<RegistroPorCorregir[]>(await llamar(`/${revista}/por-corregir`))

const corregir = (revista: 'reep' | 'ire', id: string, valor: string, usuario = AUXILIAR) =>
  llamar(`/${revista}/por-corregir/${id}`, { metodo: 'POST', cuerpo: { valor }, usuario })

describe('migrated records to correct (mock, RF-44)', () => {
  it('each journal lists its own records, with what the Excel said', async () => {
    const reep = await lista('reep')
    expect(reep.map((r) => [r.campo, r.valorExcel])).toEqual([
      ['tipo-articulo', 'Artículo corto'],
      ['estado-articulo', 'En espera del autor'],
      ['concepto', 'Publicable con ajustes menores'],
    ])
    const ire = await lista('ire')
    expect(ire.map((r) => r.campo)).toEqual(['tipo-articulo', 'concepto', 'correo-par'])
    expect(ire.every((r) => r.enlace.startsWith('/ire/'))).toBe(true)
  })

  it('a type is corrected from its closed list and leaves a trace in the history', async () => {
    const [tipo] = await lista('reep')
    if (!tipo) throw new Error('seed missing')
    expect((await corregir('reep', tipo.id, 'articulo-corto')).status).toBe(422)
    expect((await corregir('reep', tipo.id, 'reflexion')).status).toBe(204)
    expect((await lista('reep')).some((r) => r.id === tipo.id)).toBe(false)
    expect((await corregir('reep', tipo.id, 'reflexion')).status).toBe(404)

    const articulo = await json<ArticuloDetalle>(await llamar('/reep/articulos/2024-018'))
    expect(articulo.tipo).toBe('reflexion')
    expect(articulo.migrado).toBe(true)
    const h = await json<HistorialArticulo>(await llamar('/reep/articulos/2024-018/historial'))
    expect(h.auditoria[0]?.accion).toBe('Corrigió un dato migrado del Excel («Artículo corto»)')
    expect(h.auditoria.some((a) => a.tipo === 'migracion')).toBe(true)
  })

  it('states and concepts are corrected too', async () => {
    const [, estado, concepto] = await lista('reep')
    if (!estado || !concepto) throw new Error('seed missing')
    expect((await corregir('reep', estado.id, 'archivado')).status).toBe(204)
    expect((await json<ArticuloDetalle>(await llamar('/reep/articulos/2025-028'))).estado).toBe(
      'archivado',
    )
    expect((await corregir('reep', concepto.id, 'otro')).status).toBe(422)
    expect((await corregir('reep', concepto.id, 'publicable-con-modificaciones')).status).toBe(204)
    const ficha = await json<ArticuloDetalle>(await llamar('/reep/articulos/2025-041'))
    expect(ficha.asignaciones.find((a) => a.orden === 2)?.concepto).toBe(
      'publicable-con-modificaciones',
    )
  })

  it('a peer the Excel brought without email gets one before it can be invited', async () => {
    const correo = (await lista('ire')).find((r) => r.campo === 'correo-par')
    if (!correo) throw new Error('seed missing')
    const parId = correo.enlace.split('/').pop() ?? ''
    const antes = await json<{ correo: string }>(await llamar(`/ire/pares/${parId}`))
    expect(antes.correo).toBe('')
    expect((await corregir('ire', correo.id, 'sin-arroba')).status).toBe(422)
    expect((await corregir('ire', correo.id, 'jm.pantoja@udea.edu.co')).status).toBe(204)
    const despues = await json<{ correo: string }>(await llamar(`/ire/pares/${parId}`))
    expect(despues.correo).toBe('jm.pantoja@udea.edu.co')
  })

  it('the dashboard and the home summary count the records still to correct', async () => {
    expect((await json<Tablero>(await llamar('/reep/tablero'))).porCorregir).toBe(3)
    const resumen = await json<ResumenGeneral>(await llamar('/resumen'))
    expect(resumen.revistas.map((r) => r.porCorregir)).toEqual([3, 3])
    expect((await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-034'))).migrado).toBe(
      false,
    )
  })
})
