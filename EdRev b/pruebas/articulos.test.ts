/*
 * Pruebas de artículos
 */
import { describe, expect, it } from 'vitest'
import { AUXILIAR, articuloAprobado, candidato, como } from './api.js'

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

describe('artículos', () => {
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

  it('la profesora elige el resultado de cada ronda; ninguna cierra el proceso y solo una aprobada deja asignar pares', async () => {
    const { body } = await registrar()
    const api = await como(AUXILIAR)
    const ronda = (resultado: string, coincidencias = 10, observacion = '') =>
      api.post(`/reep/articulos/${body.id}/rondas`, { coincidencias, atribuidoIa: 3, resultado, observacion })
    const par = () => ({ nuevo: { nombre: `Par ${Date.now()}`, correo: `par${Date.now()}@x.co`, universidad: 'Otra', area: 'A' } })
    // el porcentaje de coincidencias es obligatorio
    expect((await api.post(`/reep/articulos/${body.id}/rondas`, { coincidencias: null, atribuidoIa: null, resultado: 'aprobado', observacion: '' })).status).toBe(422)
    // sin resultado no se registra
    expect((await api.post(`/reep/articulos/${body.id}/rondas`, { coincidencias: 10, atribuidoIa: 3, observacion: '' })).status).toBe(422)
    // requiere ajustes y rechazado: el artículo sigue en revisión y se puede registrar otra ronda
    expect((await ronda('ajustes', 10, 'Corregir la introducción')).body.rondasComite.at(-1).resultado).toBe('ajustes')
    const alta = await ronda('rechazado', 70, 'Demasiadas coincidencias')
    expect(alta.status).toBe(201)
    expect(alta.body.rondasComite.at(-1).resultado).toBe('rechazado')
    expect(alta.body.estado).toBe('en-revision')
    // sin ronda aprobada no se asignan pares
    expect((await api.post(`/reep/articulos/${body.id}/asignaciones`, par())).status).toBe(409)
    // la profesora puede aprobar aunque pase del límite de coincidencias
    const aprobada = await ronda('aprobado', 70, 'El comité continúa el proceso')
    expect(aprobada.body.rondasComite.at(-1).resultado).toBe('aprobado')
    expect(aprobada.body.estado).toBe('en-revision')
    expect((await api.post(`/reep/articulos/${body.id}/asignaciones`, par())).status).toBe(201)
  })

  it('cambia de revista en cualquier etapa, con sus pares, y quita la publicación', async () => {
    const { body } = await registrar()
    const api = await como()
    expect((await api.post(`/reep/articulos/${body.id}/trasladar`)).body.revista).toBe('ire')
    expect((await api.post(`/ire/articulos/${body.id}/trasladar`)).body.revista).toBe('reep')

    // Aprobado por el comité, con un par asignado y ya publicado: también se puede trasladar.
    const aprobado = await articuloAprobado()
    const par = await candidato(aprobado.id, 1)
    await api.post(`/reep/asignaciones/${par.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    await api.post(`/reep/articulos/${aprobado.id}/cerrar`, { estado: 'aprobado', motivo: 'ok', publicacion: { volumen: 3, numero: 1 } })
    const movido = await api.post(`/reep/articulos/${aprobado.id}/trasladar`)
    expect(movido.status).toBe(200)
    expect(movido.body.revista).toBe('ire')
    expect(movido.body.publicacion).toBeNull()
    expect(movido.body.asignaciones).toHaveLength(1)
    const historial = (await api.get(`/ire/articulos/${aprobado.id}/historial`)).body
    expect(historial.auditoria[0].accion).toContain('se quitó su publicación Vol. 3 n.º 1')
  })

  it('un artículo pendiente de un año anterior pasa solo a la lista del año actual (sin cambiar su fecha)', async () => {
    const api = await como()
    const anioActual = new Date().getFullYear()
    const crear = (n: string, fecha: string) =>
      api.post('/reep/articulos', {
        numeroOjs: n,
        titulo: `Pendiente ${n}`,
        tipo: 'reflexion',
        fechaPostulacion: fecha,
        autores: [{ nuevo: { nombre: 'Autor A', correo: '', orcid: '', filiacion: 'U', pais: 'Colombia' } }],
      })
    const pendiente = await crear(`ANIO-1-${Date.now()}`, '2024-09-10')
    const rechazado = await crear(`ANIO-2-${Date.now()}`, '2024-09-12')
    await api.post(`/reep/articulos/${rechazado.body.id}/cerrar`, { estado: 'rechazado', motivo: 'No cumple', publicacion: null })

    const delActual = (await api.get(`/reep/articulos?anio=${anioActual}&porPagina=100`)).body.items as Array<{ id: string; fechaPostulacion: string; anioGestion: number }>
    const p = delActual.find((a) => a.id === pendiente.body.id)
    expect(p).toMatchObject({ fechaPostulacion: '2024-09-10', anioGestion: anioActual })
    expect(delActual.some((a) => a.id === rechazado.body.id)).toBe(false)

    const de2024 = (await api.get('/reep/articulos?anio=2024&porPagina=100')).body.items as Array<{ id: string }>
    expect(de2024.some((a) => a.id === rechazado.body.id)).toBe(true)
    expect(de2024.some((a) => a.id === pendiente.body.id)).toBe(false)
    expect((await api.get('/reep/articulos/anios')).body).toEqual(expect.arrayContaining([anioActual, 2024]))
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

    // el ORCID se puede escribir, cambiar y también dejar vacío (no todos lo tienen)
    const orcid = `0000-0001-${String(Date.now()).slice(-4)}-${String(Date.now()).slice(-7, -4)}X`
    expect((await api.patch(`/reep/autores/${creado.body.id}`, { orcid })).body.orcid).toBe(orcid)
    expect((await api.patch(`/reep/autores/${creado.body.id}`, { orcid: '' })).body.orcid).toBe('')
    const editado = await api.patch(`/reep/autores/${creado.body.id}`, { filiacion: 'Universidad de Nariño', pais: 'Ecuador' })
    expect(editado.body).toMatchObject({ filiacion: 'Universidad de Nariño', pais: 'Ecuador' })

    // Al agregarlo a un artículo, el artículo conserva esa filiación.
    const art = await api.post('/reep/articulos', {
      numeroOjs: `F-${Date.now()}`,
      titulo: 'Con autor del directorio',
      tipo: 'reflexion',
      fechaPostulacion: '2026-10-05',
      autores: [{ autorId: creado.body.id }],
    })
    expect(art.body.autores[0]).toMatchObject({ filiacion: 'Universidad de Nariño', pais: 'Ecuador' })

    // Un autor creado dentro del formulario del artículo también aparece en el directorio.
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
