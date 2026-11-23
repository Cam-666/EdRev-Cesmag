/*
 * Pruebas de acceso
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { ADMIN, AUXILIAR, app, como } from './api.js'

describe('acceso', () => {
  it('ingresa con la cuenta inicial y rechaza una contraseña equivocada con el contador', async () => {
    const ok = await request(app).post('/api/auth/login').send(ADMIN)
    expect(ok.status).toBe(200)
    expect(ok.body.usuario).toMatchObject({ perfil: 'administrador', estado: 'activo' })
    const mal = await request(app).post('/api/auth/login').send({ ...AUXILIAR, contrasena: 'x' })
    expect(mal.status).toBe(401)
    expect(mal.body).toMatchObject({ motivo: 'credenciales', intento: 1, maximo: 3 })
  })

  it('sin sesión no hay datos', async () => {
    expect((await request(app).get('/api/reep/articulos')).status).toBe(401)
  })

  it('la Auxiliar no entra a Administración', async () => {
    const aux = await como(AUXILIAR)
    expect((await aux.get('/usuarios')).status).toBe(403)
    expect((await aux.get('/plantillas')).status).toBe(403)
    expect((await aux.get('/auditoria')).status).toBe(403)
    expect((await aux.get('/reep/tablero')).status).toBe(200)
  })

  it('una cuenta nueva define su contraseña con su enlace, de un solo uso', async () => {
    const admin = await como()
    const correo = `nueva.${Date.now()}@unicesmag.edu.co`
    const creada = await admin.post('/usuarios', { nombre: 'Cuenta Nueva', correo, perfil: 'auxiliar' })
    expect(creada.status).toBe(201)
    const token = decodeURIComponent(String(creada.body.enlaceDemo).split('token=')[1])
    expect((await request(app).get(`/api/auth/enlaces/${encodeURIComponent(token)}`)).body.motivo).toBe(
      'activacion',
    )
    const definir = (contrasena: string) =>
      request(app).post(`/api/auth/enlaces/${encodeURIComponent(token)}`).send({ contrasena })
    expect((await definir('corta')).status).toBe(422)
    expect((await definir('Revistas2027')).status).toBe(204)
    expect((await definir('OtraClave2027')).status).toBe(410)
    expect((await request(app).post('/api/auth/login').send({ correo, contrasena: 'Revistas2027' })).status).toBe(200)
  })

  it('una cuenta inhabilitada con la sesión abierta recibe el motivo, distinto de una sesión inválida', async () => {
    const admin = await como()
    const correo = `inhabilitada.${Date.now()}@unicesmag.edu.co`
    const creada = await admin.post('/usuarios', { nombre: 'Cuenta A Inhabilitar', correo, perfil: 'auxiliar' })
    const token = decodeURIComponent(String(creada.body.enlaceDemo).split('token=')[1])
    await request(app).post(`/api/auth/enlaces/${encodeURIComponent(token)}`).send({ contrasena: 'Revistas2027' })
    const sesion = (await request(app).post('/api/auth/login').send({ correo, contrasena: 'Revistas2027' })).body.token
    const consulta = () => request(app).get('/api/reep/tablero').set('Authorization', `Bearer ${sesion}`)
    expect((await consulta()).status).toBe(200)

    expect((await admin.patch(`/usuarios/${creada.body.id}`, { estado: 'inhabilitado' })).status).toBe(200)
    const rechazada = await consulta()
    expect(rechazada.status).toBe(401)
    expect(rechazada.body.motivo).toBe('inhabilitada')
    // un token falso sigue siendo un 401 sin motivo
    const falsa = await request(app).get('/api/reep/tablero').set('Authorization', 'Bearer falso')
    expect(falsa.status).toBe(401)
    expect(falsa.body.motivo).toBeUndefined()
  })

  it('no deja sin administradora activa', async () => {
    const admin = await como()
    expect((await admin.patch('/usuarios/1', { estado: 'inhabilitado' })).status).toBe(409)
  })
})
