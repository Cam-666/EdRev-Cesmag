/*
 * Pruebas de administración
 */
import { describe, expect, it } from 'vitest'
import { AUXILIAR, como } from './api.js'

describe('plantillas, auditoría, informes y pares por revista', () => {
  it('cada revista tiene sus tres plantillas en uso; se valida el texto', async () => {
    const api = await como()
    const { plantillas } = (await api.get('/plantillas')).body
    expect(plantillas.filter((p: { enUso: boolean }) => p.enUso)).toHaveLength(6)
    const constancia = plantillas.find((p: { revista: string; uso: string }) => p.revista === 'ire' && p.uso === 'constancia')
    expect((await api.put(`/plantillas/${constancia.id}`, { asunto: null, cuerpo: '   ' })).status).toBe(422) // vacío
    expect((await api.put(`/plantillas/${constancia.id}`, { asunto: null, cuerpo: '{{par}} {{articulo}} {{otro}}' })).status).toBe(422)
    // una plantilla nueva pide su revista, su nombre y para qué es; nace en blanco y no es la predeterminada
    const nueva = await api.post('/plantillas', { revista: 'ire', nombre: `Recordatorio ${Date.now()}`, fin: 'invitacion' })
    expect(nueva.body).toMatchObject({ revista: 'ire', uso: null, clase: 'correo', fin: 'invitacion', enUso: false })
    // los tres textos automáticos de la revista siguen en uso: no hay nada que «poner en uso»
    const despues = (await api.get('/plantillas')).body.plantillas
    for (const fin of ['invitacion', 'agradecimiento', 'constancia']) {
      expect(despues.filter((p: { revista: string; fin: string; enUso: boolean }) => p.revista === 'ire' && p.fin === fin && p.enUso)).toHaveLength(1)
    }
    expect((await api.delete(`/plantillas/${nueva.body.id}`)).status).toBe(204)
  })

  it('se elimina una cuenta sin actividad; no la propia ni una con historial', async () => {
    const api = await como()
    const correo = `eliminar${Date.now()}@unicesmag.edu.co`
    const creada = await api.post('/usuarios', { nombre: 'Cuenta temporal', correo, perfil: 'auxiliar' })
    expect(creada.status).toBe(201)
    expect((await api.delete(`/usuarios/${creada.body.id}`)).status).toBe(204)
    expect((await api.get('/usuarios')).body.some((u: { id: string }) => u.id === creada.body.id)).toBe(false)
    expect((await api.delete(`/usuarios/${creada.body.id}`)).status).toBe(404)
    const yo = (await api.get('/usuarios')).body.find((u: { correo: string }) => u.correo === 'maria.mendoza@unicesmag.edu.co')
    expect((await api.delete(`/usuarios/${yo.id}`)).status).toBe(409)
    // Una cuenta con actividad registrada no se elimina: se responde con el aviso y no con un error del servidor.
    const aux = await como(AUXILIAR)
    expect((await aux.post('/reep/pares', { nombre: 'Par de la Auxiliar', correo: `aux${Date.now()}@x.co`, universidad: 'U', area: 'A' })).status).toBe(201)
    const cuentaAux = (await api.get('/usuarios')).body.find((u: { correo: string }) => u.correo === 'andrea.villota@unicesmag.edu.co')
    const rechazo = await api.delete(`/usuarios/${cuentaAux.id}`)
    expect(rechazo.status).toBe(409)
    expect(rechazo.body.mensaje).toContain('inhabilítela')
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

  it('los días de espera empiezan en 5, la Auxiliar también los cambia y queda en la auditoría', async () => {
    const api = await como()
    expect((await api.get('/configuracion')).body).toMatchObject({ diasEspera: 5 })
    const aux = await como(AUXILIAR)
    expect((await aux.get('/configuracion')).status).toBe(200)
    expect((await aux.put('/configuracion', { diasEspera: 6 })).body).toMatchObject({ diasEspera: 6 })
    expect((await api.put('/configuracion', { diasEspera: 0 })).status).toBe(422)
    expect((await api.put('/configuracion', { diasEspera: 90 })).status).toBe(422)
    expect((await api.put('/configuracion', { diasEspera: 7 })).body).toMatchObject({ diasEspera: 7 })
    expect((await api.get('/configuracion')).body).toMatchObject({ diasEspera: 7 })
    const aud = (await api.get('/auditoria?tipo=edicion&porPagina=5')).body.items as Array<{ accion: string }>
    expect(aud.some((a) => a.accion.includes('de 6 a 7'))).toBe(true)
    expect(aud.some((a) => a.accion.includes('de 5 a 6'))).toBe(true)
    await api.put('/configuracion', { diasEspera: 5 })
  })
})
