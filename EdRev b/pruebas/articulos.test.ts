/*
 * Pruebas de artículos — RF-01 a RF-08, RF-35, RF-36.
 */
import { describe, expect, it } from 'vitest'
import { AUXILIAR, articuloAprobado, como } from './api.js'

async function registrar(revista: 'reep' | 'ire' = 'reep', numero = `A-${Date.now()}`) {
  const api = await como()
  return api.post(`/${revista}/articulos`, {
    numeroOjs: numero,
    titulo: 'Narrativas docentes',
    tipo: 'reflexion',
    fechaPostulacion: '2026-10-05',
    autores: [{ nuevo: { nombre: 'Laura Rivera', correo: 'l@x.co', orcid: '', filiacion: 'Universidad Mariana', pais: 'Colombia' } }],
  })
}

describe('artículos (RF-01 a RF-08, RF-35, RF-36)', () => {
  it('registra con sus autores y avisa el número de OJS repetido', async () => {
    const r = await registrar('reep', 'OJS-REP-1')
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ estado: 'postulado', revista: 'reep', autores: [{ nombre: 'Laura Rivera', orden: 1 }] })
    const api = await como()
    expect((await api.get('/reep/articulos/existe?numeroOjs=OJS-REP-1')).body.existe).toBe(true)
    expect((await api.get('/ire/articulos/existe?numeroOjs=OJS-REP-1')).body.existe).toBe(false)
  })

  it('cada revista ve solo sus artículos', async () => {
    const { body } = await registrar('ire')
    const api = await como()
    expect((await api.get(`/reep/articulos/${body.id}`)).status).toBe(404)
    expect((await api.get(`/ire/articulos/${body.id}`)).status).toBe(200)
  })

  it('rondas del comité sin límite; rechazado cierra la revisión', async () => {
    const { body } = await registrar()
    const api = await como(AUXILIAR)
    const ronda = (resultado: string) =>
      api.post(`/reep/articulos/${body.id}/rondas`, { coincidencias: 18, atribuidoIa: 3, resultado, observacion: 'x' })
    expect((await ronda('ajustes')).status).toBe(201)
    expect((await ronda('ajustes')).status).toBe(201)
    const tercera = await ronda('rechazado')
    expect(tercera.body.estado).toBe('rechazado')
    expect(tercera.body.rondasComite.map((r: { resultado: string }) => r.resultado)).toEqual(['ajustes', 'ajustes', 'rechazado'])
    expect((await ronda('aprobado')).status).toBe(409)
  })

  it('cambia de revista en la revisión del comité y no después de aprobado (RF-07)', async () => {
    const { body } = await registrar()
    const api = await como()
    const ida = await api.post(`/reep/articulos/${body.id}/trasladar`)
    expect(ida.body.revista).toBe('ire')
    expect((await api.post(`/ire/articulos/${body.id}/trasladar`)).body.revista).toBe('reep')
    const aprobado = await articuloAprobado()
    expect((await api.post(`/reep/articulos/${aprobado.id}/trasladar`)).status).toBe(409)
  })

  it('cierra el proceso con motivo; aprobar pide volumen y número', async () => {
    const { id } = await articuloAprobado()
    const api = await como()
    expect((await api.post(`/reep/articulos/${id}/cerrar`, { estado: 'aprobado', motivo: 'ok', publicacion: null })).status).toBe(422)
    const ok = await api.post(`/reep/articulos/${id}/cerrar`, {
      estado: 'aprobado',
      motivo: 'Publicable',
      publicacion: { volumen: 11, numero: 2 },
    })
    expect(ok.body).toMatchObject({ estado: 'aprobado', publicacion: { volumen: 11, numero: 2 } })
    const hist = await api.get(`/reep/articulos/${id}/historial`)
    expect(hist.body.auditoria[0]).toMatchObject({ tipo: 'cierre' })
    expect((await api.get('/reep/publicaciones')).body).toContainEqual({ valor: '11-2', etiqueta: 'Vol. 11 n.º 2' })
  })

  it('el listado filtra por estado y pagina', async () => {
    const api = await como()
    const r = await api.get('/reep/articulos?estado=rechazado&porPagina=2')
    expect(r.body.items.length).toBeLessThanOrEqual(2)
    expect(r.body.items.every((a: { estado: string }) => a.estado === 'rechazado')).toBe(true)
  })

  it('el ORCID es opcional: varios autores sin ORCID conviven y uno mal escrito se rechaza', async () => {
    const api = await como()
    const autor = (nombre: string, orcid: string) => ({ nombre, correo: `${nombre.toLowerCase().replace(' ', '.')}@x.co`, orcid, filiacion: 'U', pais: 'Colombia' })
    const uno = await api.post('/reep/autores', autor('Sin Orcid Uno', ''))
    const dos = await api.post('/reep/autores', autor('Sin Orcid Dos', ''))
    expect(uno.status).toBe(201)
    expect(dos.status).toBe(201)
    expect(uno.body.orcid).toBe('')
    expect((await api.get(`/reep/autores/${dos.body.id}`)).body.orcid).toBe('')
    expect((await api.post('/reep/autores', autor('Mal Orcid', '12345'))).status).toBe(422)
  })

  it('la filiación y el país del formulario del autor aparecen en su ficha y pasan al artículo', async () => {
    const api = await como()
    const datos = { nombre: 'Autor Con Filiación', correo: 'af@x.co', orcid: '', filiacion: 'Universidad Mariana', pais: 'Colombia' }
    const creado = await api.post('/reep/autores', datos)
    expect(creado.status).toBe(201)
    const ficha = (await api.get(`/reep/autores/${creado.body.id}`)).body
    expect(ficha).toMatchObject({ filiacion: 'Universidad Mariana', pais: 'Colombia' })

    const editado = await api.patch(`/reep/autores/${creado.body.id}`, { filiacion: 'Universidad de Nariño', pais: 'Ecuador' })
    expect(editado.body).toMatchObject({ filiacion: 'Universidad de Nariño', pais: 'Ecuador' })

    // Added to an article, the article keeps that affiliation (RF-09).
    const art = await api.post('/reep/articulos', {
      numeroOjs: `F-${Date.now()}`,
      titulo: 'Con autor del directorio',
      tipo: 'reflexion',
      fechaPostulacion: '2026-10-05',
      autores: [{ autorId: creado.body.id }],
    })
    expect(art.body.autores[0]).toMatchObject({ filiacion: 'Universidad de Nariño', pais: 'Ecuador' })

    // An author created inside the article form shows it in the directory too.
    const nuevo = await api.post('/reep/articulos', {
      numeroOjs: `G-${Date.now()}`,
      titulo: 'Con autor nuevo',
      tipo: 'reflexion',
      fechaPostulacion: '2026-10-05',
      autores: [{ nuevo: { nombre: 'Autora Nueva', correo: '', orcid: '', filiacion: 'Universidad CESMAG', pais: 'Colombia' } }],
    })
    const id = nuevo.body.autores[0].id
    expect((await api.get(`/reep/autores/${id}`)).body).toMatchObject({ filiacion: 'Universidad CESMAG', pais: 'Colombia' })
  })
})
