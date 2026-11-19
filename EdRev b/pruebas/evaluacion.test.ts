/*
 * Pruebas de asignación, evaluación, constancias y correos — RF-19 a RF-34.
 */
import { describe, expect, it } from 'vitest'
import { articuloAprobado, candidato, como } from './api.js'

const hoy = () => new Date().toISOString().slice(0, 10)

describe('asignación, evaluación, constancias y correos (RF-19 a RF-34)', () => {
  it('un artículo archivado y retomado como «Postulado» pasa de nuevo por el comité antes de tener pares', async () => {
    const api = await como()
    const art = await articuloAprobado()
    await candidato(art.id, 1)
    await api.post(`/reep/articulos/${art.id}/cerrar`, { estado: 'archivado', motivo: 'Sin respuesta', publicacion: null })
    expect((await api.post(`/reep/articulos/${art.id}/reabrir`, { estado: 'postulado', motivo: 'Se retoma' })).status).toBe(200)
    const nuevo = { nuevo: { nombre: 'Otro', profesion: '', correo: `o${Date.now()}@x.co`, universidad: 'U', area: 'A' } }
    expect((await api.post(`/reep/articulos/${art.id}/asignaciones`, nuevo)).status).toBe(409)
    // it already had a peer, and still the committee can register a new round
    const ronda = await api.post(`/reep/articulos/${art.id}/rondas`, { coincidencias: 5, atribuidoIa: 1, observacion: '' })
    expect(ronda.status).toBe(201)
    expect((await api.post(`/reep/articulos/${art.id}/asignaciones`, nuevo)).status).toBe(201)
  })

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

  it('con 2 pares el artículo ya no busca más; el que declina libera su lugar', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    const uno = await candidato(id, 1)
    const dos = await candidato(id, 2)
    const bloqueado = await api.post(`/reep/articulos/${id}/asignaciones`, {
      nuevo: { nombre: 'Tercero', profesion: '', correo: `t.${id}@udenar.edu.co`, universidad: 'Universidad X', area: 'A' },
    })
    expect(bloqueado.status).toBe(409)
    expect(bloqueado.body.mensaje).toContain('2 pares evaluadores')

    // El primero no acepta esta invitación: queda un lugar y no se bloquea al par.
    expect((await api.post(`/reep/asignaciones/${uno.asignacion.id}/respuesta`, { respuesta: 'no-acepto' })).status).toBe(200)
    expect((await api.get(`/reep/pares/${uno.par.id}`)).body.bloqueo).toBeNull()
    await candidato(id, 3)
    expect((await api.post(`/reep/asignaciones/${dos.asignacion.id}/respuesta`, { respuesta: 'acepto' })).status).toBe(200)
    expect((await api.get(`/reep/articulos/${id}`)).body.estado).toBe('en-evaluacion')
  })

  it('el tercer par solo se permite cuando los conceptos de los dos no coinciden', async () => {
    const api = await como()
    const entregar = async (id: string, n: number, concepto: string) => {
      const p = await candidato(id, n)
      await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
      await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })
      await api.post(`/reep/asignaciones/${p.asignacion.id}/concepto`, { concepto })
    }
    const nuevoPar = (id: string) =>
      api.post(`/reep/articulos/${id}/asignaciones`, {
        nuevo: { nombre: 'Tercero', profesion: '', correo: `tercero.${id}@udenar.edu.co`, universidad: 'Universidad Z', area: 'A' },
      })

    const coinciden = await articuloAprobado()
    await entregar(coinciden.id, 1, 'publicable')
    await entregar(coinciden.id, 2, 'publicable')
    expect((await nuevoPar(coinciden.id)).status).toBe(409)

    const difieren = await articuloAprobado()
    await entregar(difieren.id, 1, 'publicable')
    await entregar(difieren.id, 2, 'no-publicable')
    const tercero = await nuevoPar(difieren.id)
    expect(tercero.status).toBe(201)
    expect(tercero.body.asignacion.esDesempate).toBe(true)
  })

  it('no se asigna un par de la misma institución de un autor', async () => {
    const api = await como()
    const art = await api.post('/reep/articulos', {
      numeroOjs: `INST-${Date.now()}`,
      titulo: 'Con autor de la Universidad de Nariño',
      tipo: 'investigacion',
      fechaPostulacion: '2026-10-01',
      autores: [{ nuevo: { nombre: 'Autor N', correo: '', orcid: '', filiacion: 'Universidad de Nariño', pais: 'Colombia' } }],
    })
    await api.post(`/reep/articulos/${art.body.id}/rondas`, { coincidencias: 5, atribuidoIa: 1, observacion: '' })
    const mismo = await api.post(`/reep/articulos/${art.body.id}/asignaciones`, {
      nuevo: { nombre: 'Par N', profesion: '', correo: `parn.${Date.now()}@udenar.edu.co`, universidad: 'universidad de nariño', area: 'A' },
    })
    expect(mismo.status).toBe(409)
    expect(mismo.body.mensaje).toContain('misma institución')
    // El rechazo no deja al candidato a medias: no quedó registrado en la base de pares.
    const lista = (await api.get('/reep/pares?estado=todos&porPagina=100')).body.items as Array<{ nombre: string }>
    expect(lista.some((p) => p.nombre === 'Par N')).toBe(false)
    // En la lista de pares asignables ya no aparece nadie de esa institución.
    const asignables = (await api.get(`/reep/pares?estado=asignables&articulo=${art.body.id}&porPagina=100`)).body.items as Array<{ universidad: string }>
    expect(asignables.some((p) => p.universidad.toLowerCase() === 'universidad de nariño')).toBe(false)
    const otro = await api.post(`/reep/articulos/${art.body.id}/asignaciones`, {
      nuevo: { nombre: 'Par M', profesion: '', correo: `parm.${Date.now()}@umariana.edu.co`, universidad: 'Universidad Mariana', area: 'A' },
    })
    expect(otro.status).toBe(201)
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
    expect(vista.body.cuerpo).toContain('CERTIFICA QUE')
    expect(vista.body.cuerpo).toContain('Publindex') // las indexaciones de la revista
    expect(vista.body.cuerpo).not.toContain('**') // sin las marcas del formato
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
    await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy(), concepto: 'publicable' })
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
