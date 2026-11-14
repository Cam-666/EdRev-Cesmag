/*
 * Pruebas de administración — RF-12, RF-38, RF-41, RF-45.
 */
import { describe, expect, it } from 'vitest'
import { AUXILIAR, como } from './api.js'

describe('plantillas, auditoría, informes y pares por revista (RF-12, RF-38, RF-41, RF-45)', () => {
  it('cada revista tiene sus tres plantillas en uso; se valida el texto', async () => {
    const api = await como()
    const { plantillas } = (await api.get('/plantillas')).body
    expect(plantillas).toHaveLength(6)
    const constancia = plantillas.find((p: { revista: string; uso: string }) => p.revista === 'ire' && p.uso === 'constancia')
    expect((await api.put(`/plantillas/${constancia.id}`, { asunto: null, cuerpo: 'Sin marcadores' })).status).toBe(422)
    expect((await api.put(`/plantillas/${constancia.id}`, { asunto: null, cuerpo: '{{par}} {{articulo}} {{otro}}' })).status).toBe(422)
    const nueva = await api.post('/plantillas', { revista: 'ire', nombre: 'Constancia 2027', uso: 'constancia' })
    expect(nueva.body).toMatchObject({ revista: 'ire', uso: 'constancia', enUso: false })
    expect((await api.post(`/plantillas/${nueva.body.id}/usar`)).body.enUso).toBe(true)
    const despues = (await api.get('/plantillas')).body.plantillas
    expect(despues.filter((p: { revista: string; uso: string; enUso: boolean }) => p.revista === 'ire' && p.uso === 'constancia' && p.enUso)).toHaveLength(1)
  })

  it('la auditoría filtra por tipo y el informe suma ambas revistas', async () => {
    const api = await como()
    const aud = (await api.get('/auditoria?tipo=registro&porPagina=5')).body
    expect(aud.items.every((a: { tipo: string }) => a.tipo === 'registro')).toBe(true)
    const periodo = (await api.get('/informes/periodos')).body[0].valor
    const inf = (await api.get(`/informes?revista=ambas&periodo=${periodo}`)).body
    expect(inf.postulados.total).toBe(inf.postulados.reep + inf.postulados.ire)
    expect((await api.get('/informes?revista=otra&periodo=x')).status).toBe(422)
  })

  it('la base de pares es común: un par registrado en una revista se ve en la otra y el correo no se repite', async () => {
    const api = await como()
    const correo = `compartido${Date.now()}@x.co`
    const creado = await api.post('/reep/pares', { nombre: 'Par Compartido', profesion: 'PhD', correo, universidad: 'U', area: 'A' })
    expect(creado.status).toBe(201)
    const enIre = (await api.get('/ire/pares?estado=todos&porPagina=100')).body.items as Array<{ id: string }>
    expect(enIre.some((p) => p.id === creado.body.id)).toBe(true)
    expect((await api.get(`/ire/pares/${creado.body.id}`)).status).toBe(200)
    const repetido = await api.post('/ire/pares', { nombre: 'Otro', correo, universidad: 'U', area: 'A' })
    expect(repetido.status).toBe(409)
    expect(repetido.body.parId).toBe(creado.body.id)
  })

  it('los días de espera empiezan en 5, solo la Administradora los cambia y queda en la auditoría', async () => {
    const api = await como()
    expect((await api.get('/configuracion')).body).toEqual({ diasEspera: 5 })
    const aux = await como(AUXILIAR)
    expect((await aux.get('/configuracion')).status).toBe(403)
    expect((await aux.put('/configuracion', { diasEspera: 3 })).status).toBe(403)
    expect((await api.put('/configuracion', { diasEspera: 0 })).status).toBe(422)
    expect((await api.put('/configuracion', { diasEspera: 90 })).status).toBe(422)
    expect((await api.put('/configuracion', { diasEspera: 7 })).body).toEqual({ diasEspera: 7 })
    expect((await api.get('/configuracion')).body).toEqual({ diasEspera: 7 })
    const aud = (await api.get('/auditoria?tipo=edicion&porPagina=5')).body.items as Array<{ accion: string }>
    expect(aud.some((a) => a.accion.includes('de 5 a 7'))).toBe(true)
    await api.put('/configuracion', { diasEspera: 5 })
  })
})
