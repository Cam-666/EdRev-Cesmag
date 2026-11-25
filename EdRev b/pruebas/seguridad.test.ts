/*
 * Pruebas de la separación entre rutas públicas y privadas y de la validación del JWT: firma, expiración, algoritmo y secreto seguro.
 */
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { config, secretoSeguro } from '../src/config.js'
import { app, AUXILIAR, como } from './api.js'

const firmar = (opciones: jwt.SignOptions = {}, secreto = config.jwtSecreto) =>
  jwt.sign({ sub: '1' }, secreto, { algorithm: 'HS256', expiresIn: '1h', ...opciones })

describe('rutas públicas y privadas', () => {
  it('la salud y el acceso son públicos; todo lo demás pide sesión', async () => {
    expect((await request(app).get('/api/salud')).status).toBe(200)
    expect((await request(app).post('/api/auth/login').send({})).status).not.toBe(401)
    for (const ruta of ['/api/articulos', '/api/reep/articulos', '/api/pares', '/api/plantillas', '/api/informes', '/api/usuarios']) {
      expect((await request(app).get(ruta)).status).toBe(401)
    }
  })

  it('las cuentas de usuario son solo de la Administradora: la Auxiliar recibe 403', async () => {
    const aux = await como(AUXILIAR)
    expect((await aux.get('/usuarios')).status).toBe(403)
    expect((await aux.patch('/usuarios/1', { activo: false })).status).toBe(403)
    expect((await aux.get('/plantillas')).status).toBe(200)
    expect((await aux.get('/reep/articulos')).status).toBe(200)
  })
})

describe('validación del JWT', () => {
  const con = (token: string) => request(app).get('/api/reep/articulos').set('Authorization', `Bearer ${token}`)

  it('acepta un token propio y vigente', async () => {
    expect((await con(firmar())).status).toBe(200)
  })

  it('rechaza un token vencido, con otra firma, con otro algoritmo o sin usuario', async () => {
    expect((await con(firmar({ expiresIn: -10 }))).status).toBe(401)
    expect((await con(firmar({}, 'otro-secreto-distinto-de-treinta-y-dos-letras'))).status).toBe(401)
    expect((await con(firmar({ algorithm: 'HS384' }))).status).toBe(401)
    expect((await con(jwt.sign({ sub: '999999' }, config.jwtSecreto, { algorithm: 'HS256' }))).status).toBe(401)
    expect((await con(jwt.sign({ sub: 'abc' }, config.jwtSecreto, { algorithm: 'HS256' }))).status).toBe(401)
    expect((await con('no-es-un-token')).status).toBe(401)
  })

  it('un token sin firma («alg: none») no entra', async () => {
    const sinFirma = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1"}').toString('base64url')}.`
    expect((await con(sinFirma)).status).toBe(401)
  })
})

describe('secreto del JWT', () => {
  it('exige una cadena larga y que no sea el texto de ejemplo', () => {
    expect(secretoSeguro('corto')).toBe(false)
    expect(secretoSeguro('cambia-este-valor-por-un-secreto-largo-y-aleatorio')).toBe(false)
    expect(secretoSeguro('cambie-esto-por-una-cadena-larga-y-aleatoria')).toBe(false)
    expect(secretoSeguro('9f3a7c1e5b2d48a6c0e7f1b3a5d9c2e4f6a8b0d1c3e5f7a9')).toBe(true)
  })
})
