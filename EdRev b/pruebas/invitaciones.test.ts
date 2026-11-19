/*
 * Pruebas de la respuesta del par desde el correo — RF-22, RF-15, RF-24.
 */
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { config } from '../src/config.js'
import { botonesHtml, firmarRespuesta, type AccionCorreo } from '../src/lib/respuestas.js'
import { app, articuloAprobado, candidato, como } from './api.js'

const url = (token: string) => `/api/invitaciones/${encodeURIComponent(token)}`

async function invitacion(n: number) {
  const { id } = await articuloAprobado()
  const p = await candidato(id, n)
  return { articulo: id, par: p.par.id, asignacion: Number(p.asignacion.id) }
}

const responder = (asignacion: number, accion: AccionCorreo) =>
  request(app).post(url(firmarRespuesta(asignacion, accion)))

describe('respuesta del par desde el correo (RF-22)', () => {
  it('«Acepto» registra la aceptación, lleva el artículo a En evaluación y el enlace sirve una vez', async () => {
    const i = await invitacion(1)
    const info = await request(app).get(url(firmarRespuesta(i.asignacion, 'acepto')))
    expect(info.status).toBe(200)
    expect(info.body).toMatchObject({ accion: 'acepto', sigla: 'reep', respondida: false })
    expect(info.body.articulo).toContain('Artículo de prueba')

    expect((await responder(i.asignacion, 'acepto')).status).toBe(200)
    const api = await como()
    expect((await api.get(`/reep/articulos/${i.articulo}`)).body.estado).toBe('en-evaluacion')
    const otra = await responder(i.asignacion, 'no-acepto')
    expect(otra.status).toBe(409)
    expect(otra.body.mensaje).toContain('ya respondió')
    expect((await request(app).get(url(firmarRespuesta(i.asignacion, 'acepto')))).body.respondida).toBe(true)

    const historial = (await api.get(`/reep/articulos/${i.articulo}/historial`)).body.auditoria as Array<{ accion: string; usuario: string }>
    expect(historial.some((a) => a.accion.includes('respondió desde el correo') && a.usuario === 'Sistema')).toBe(true)
  })

  it('«No acepto esta invitación» no bloquea al par; «No deseo participar más» sí', async () => {
    const api = await como()
    const a = await invitacion(2)
    expect((await responder(a.asignacion, 'no-acepto')).status).toBe(200)
    expect((await api.get(`/reep/pares/${a.par}`)).body.bloqueo).toBeNull()

    const b = await invitacion(3)
    expect((await responder(b.asignacion, 'no-desea')).status).toBe(200)
    const par = (await api.get(`/reep/pares/${b.par}`)).body
    expect(par.bloqueo).toMatchObject({ motivo: 'no-desea' })
    // El bloqueo vale para las dos revistas (base común).
    expect((await api.get(`/ire/pares/${b.par}`)).body.bloqueo).toMatchObject({ motivo: 'no-desea' })
  })

  it('un enlace alterado, vencido o de otra clase no sirve', async () => {
    expect((await request(app).get(url('basura'))).status).toBe(404)
    const vencido = jwt.sign({ ev: 1, acc: 'acepto' }, `${config.jwtSecreto}:respuestas`, { expiresIn: -60 })
    const r = await request(app).get(url(vencido))
    expect(r.status).toBe(410)
    expect(r.body.motivo).toBe('vencido')
    const deSesion = jwt.sign({ ev: 1, acc: 'acepto' }, config.jwtSecreto)
    expect((await request(app).post(url(deSesion))).status).toBe(404)
  })

  it('el correo lleva tres botones con enlaces firmados', () => {
    const html = botonesHtml(7)
    expect(html.match(/href="/g)).toHaveLength(3)
    for (const texto of ['Acepto la invitación', 'No acepto esta invitación', 'No deseo participar más']) {
      expect(html).toContain(texto)
    }
    expect(html).toContain('/invitacion?token=')
  })

  it('la plantilla de invitación de las dos revistas incluye {{botones}}', async () => {
    const api = await como()
    const { plantillas } = (await api.get('/plantillas')).body as {
      plantillas: Array<{ uso: string; enUso: boolean; cuerpo: string; variables: string[] }>
    }
    const invitaciones = plantillas.filter((p) => p.uso === 'invitacion' && p.enUso)
    expect(invitaciones).toHaveLength(2)
    for (const p of invitaciones) {
      expect(p.cuerpo).toContain('{{botones}}')
      expect(p.variables).toContain('botones')
    }
  })
})
