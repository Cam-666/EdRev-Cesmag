/*
 * Pruebas de robustez: entradas mal formadas del cliente no son errores del servidor, la fecha de
 * «hoy» es la de la dependencia, una plantilla no sirve para dos fines y las constancias que no
 * se pueden emitir dicen por qué.
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { fechaLocal } from '../src/lib/fechas.js'
import { enteroDe } from '../src/lib/http.js'
import { app, articuloAprobado, candidato, como } from './api.js'

const PNG = Buffer.alloc(3 * 1024 * 1024, 0)

describe('entradas del cliente', () => {
  it('una página o un tamaño que no son enteros usan el valor por defecto', async () => {
    const api = await como()
    expect(enteroDe('abc', 1, 1)).toBe(1)
    expect(enteroDe('1.5', 1, 1)).toBe(1)
    expect(enteroDe('500', 10, 1, 100)).toBe(100)
    expect(enteroDe('-3', 1, 1)).toBe(1)
    for (const ruta of [
      '/reep/articulos?pagina=abc&porPagina=1.5',
      '/reep/correos?pagina=NaN',
      '/reep/pares?pagina=x&porPagina=y',
      '/reep/autores?limite=zzz',
      '/auditoria?pagina=--&porPagina=%',
    ]) {
      expect((await api.get(ruta)).status).toBe(200)
    }
  })

  it('una fecha que no es fecha se ignora y los comodines del buscador son texto', async () => {
    const api = await como()
    expect((await api.get('/reep/articulos?desde=hola&hasta=mañana')).status).toBe(200)
    await articuloAprobado()
    expect((await api.get('/reep/articulos?porPagina=100')).body.total).toBeGreaterThan(0)
    // ni «%» ni «_» son comodines: ningún título los lleva y no coinciden con todo
    expect((await api.get('/reep/articulos?q=%25&porPagina=100')).body.total).toBe(0)
    expect((await api.get('/reep/articulos?q=_&porPagina=100')).body.total).toBe(0)
  })

  it('un JSON mal formado es 400 y una imagen de más de 2 MB es 413, no 500', async () => {
    const api = await como()
    const malo = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"correo": ')
    expect(malo.status).toBe(400)
    expect(malo.body.mensaje).toContain('JSON')
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; clase: string }>
    const archivo = lista.find((p) => p.clase === 'archivo')
    const grande = await api.subir(`/plantillas/${archivo?.id}/imagen/encabezado`, PNG, 'enorme.png')
    expect(grande.status).toBe(413)
    expect(grande.body.mensaje).toContain('2 MB')
  })
})

describe('«hoy» en la zona de la dependencia', () => {
  it('a las 8 p. m. de Colombia sigue siendo el mismo día aunque el servidor ya esté en el siguiente', () => {
    // 2026-11-19 01:30 UTC = 2026-11-18 20:30 en Colombia
    expect(fechaLocal(new Date('2026-11-19T01:30:00Z'))).toBe('2026-11-18')
    expect(fechaLocal(new Date('2026-11-19T05:30:00Z'))).toBe('2026-11-19')
  })
})

describe('plantillas y constancias', () => {
  it('los correos automáticos tienen siempre su plantilla en uso, una por tipo en cada revista', async () => {
    const api = await como()
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ revista: string; uso: string | null }>
    for (const revista of ['reep', 'ire']) {
      for (const uso of ['invitacion', 'agradecimiento', 'constancia']) {
        expect(lista.filter((p) => p.revista === revista && p.uso === uso)).toHaveLength(1)
      }
    }
  })

  it('al emitir todas las pendientes, las que no se pueden emitir dicen por qué', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const p = await candidato(art.id, 90)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    // entregó sin concepto: no se puede emitir su constancia todavía
    await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: fechaLocal() })
    const r = await api.post('/reep/constancias/emitir-pendientes', {})
    expect(r.status).toBe(200)
    expect(r.body.fallidos).toBeGreaterThanOrEqual(1)
    expect(r.body.motivos.some((m: { motivo: string }) => m.motivo.includes('Registre primero el concepto'))).toBe(true)
  })
})

describe('webhook del servicio de correo', () => {
  it('sin el token correcto no entra', async () => {
    process.env.BREVO_WEBHOOK_TOKEN = 'token-de-prueba-para-el-webhook'
    expect((await request(app).post('/api/webhooks/brevo?token=otro').send([])).status).toBe(401)
    expect((await request(app).post('/api/webhooks/brevo').send([])).status).toBe(401)
    expect((await request(app).post('/api/webhooks/brevo?token=token-de-prueba-para-el-webhook').send([])).status).toBe(200)
  })
})
