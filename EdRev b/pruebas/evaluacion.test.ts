/*
 * Pruebas de asignación, evaluación, constancias y correos — RF-19 a RF-34.
 */
import { describe, expect, it } from 'vitest'
import { articuloAprobado, candidato, como } from './api.js'

const hoy = () => new Date().toISOString().slice(0, 10)

describe('asignación, evaluación, constancias y correos (RF-19 a RF-34)', () => {
  it('no asigna pares antes de que el comité apruebe', async () => {
    const api = await como()
    const art = await api.post('/reep/articulos', {
      numeroOjs: `NA-${Date.now()}`,
      titulo: 'Sin aprobar',
      tipo: 'revision',
      fechaPostulacion: '2026-10-01',
      autores: [{ nuevo: { nombre: 'X Y', correo: '', orcid: '', filiacion: '', pais: '' } }],
    })
    const r = await api.post(`/reep/articulos/${art.body.id}/asignaciones`, {
      nuevo: { nombre: 'P', profesion: '', correo: `p${Date.now()}@x.co`, universidad: 'U', area: 'A' },
    })
    expect(r.status).toBe(409)
  })

  it('máximo tres pares que aceptaron; los que no aceptan no ocupan cupo y no se bloquean', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    const a = [1, 2, 3, 4, 5].map((n) => candidato(id, n))
    const asig = []
    for (const p of a) asig.push(await p)
    const responder = (i: number, respuesta: string) =>
      api.post(`/reep/asignaciones/${asig[i]?.asignacion.id}/respuesta`, { respuesta })
    expect((await responder(0, 'no-acepto')).status).toBe(200)
    expect((await api.get(`/reep/pares/${asig[0]?.par.id}`)).body.bloqueo).toBeNull()
    for (const i of [1, 2, 3]) expect((await responder(i, 'acepto')).status).toBe(200)
    expect((await responder(4, 'acepto')).status).toBe(409)
    expect((await api.get(`/reep/articulos/${id}`)).body.estado).toBe('en-evaluacion')
  })

  it('«no desea participar más» bloquea al par; un par ocupado no se asigna a otro artículo', async () => {
    const uno = await articuloAprobado()
    const otro = await articuloAprobado()
    const api = await como()
    const p = await candidato(uno.id, 9)
    expect((await api.post(`/reep/articulos/${otro.id}/asignaciones`, { parId: p.par.id })).status).toBe(409)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'no-desea' })
    expect((await api.get(`/reep/pares/${p.par.id}`)).body.bloqueo.motivo).toBe('no-desea')
  })

  it('entrega → constancia pendiente → emitir encola el agradecimiento → PDF', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    const p = await candidato(id, 1)
    expect((await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })).status).toBe(409)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    expect((await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: '2099-01-01' })).status).toBe(422)
    const entrega = await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })
    expect(entrega.body.constanciaId).toBe(p.asignacion.id)
    expect((await api.post(`/reep/asignaciones/${p.asignacion.id}/concepto`, { concepto: 'publicable-con-modificaciones' })).status).toBe(200)

    const pendientes = (await api.get('/reep/constancias')).body.pendientes
    expect(pendientes.some((f: { id: string }) => f.id === p.asignacion.id)).toBe(true)
    const vista = await api.get(`/reep/constancias/${p.asignacion.id}/vista-previa`)
    expect(vista.body.cuerpo).toContain('HACE CONSTAR QUE')
    const emision = await api.post(`/reep/constancias/${p.asignacion.id}/emitir`)
    expect(emision.body.constancia.estado).toBe('emitida')
    expect((await api.post(`/reep/constancias/${p.asignacion.id}/emitir`)).status).toBe(409)
    const pdf = await api.get(`/reep/constancias/${p.asignacion.id}/pdf`)
    expect(pdf.headers['content-type']).toContain('application/pdf')

    const correos = (await api.get('/reep/correos?porPagina=100')).body
    expect(correos.items.some((c: { tipo: string; asignacionId: string }) => c.tipo === 'agradecimiento' && c.asignacionId === p.asignacion.id)).toBe(true)
  })

  it('emitir sin la opción de agradecimiento envía solo la constancia', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    const p = await candidato(id, 1)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })
    const emision = await api.post(`/reep/constancias/${p.asignacion.id}/emitir`, { conAgradecimiento: false })
    expect(emision.status).toBe(200)
    const correos = (await api.get('/reep/correos?porPagina=100')).body
    const mio = correos.items.find((c: { asignacionId: string; tipo: string }) => c.asignacionId === p.asignacion.id && c.tipo !== 'invitacion')
    expect(mio.tipo).toBe('constancia')
  })

  it('el desempate se marca cuando los dos primeros conceptos se contradicen (RF-21)', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    for (const [n, concepto] of [[1, 'publicable'], [2, 'no-publicable']] as const) {
      const p = await candidato(id, n)
      await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
      await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })
      await api.post(`/reep/asignaciones/${p.asignacion.id}/concepto`, { concepto })
    }
    const tercero = await candidato(id, 3)
    const ficha = (await api.get(`/reep/articulos/${id}`)).body
    expect(ficha.asignaciones.find((a: { id: string }) => a.id === tercero.asignacion.id).esDesempate).toBe(true)
  })
})
