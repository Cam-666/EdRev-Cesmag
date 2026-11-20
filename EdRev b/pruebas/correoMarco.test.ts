/*
 * Pruebas del marco institucional de los correos.
 */
import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { aHtml } from '../src/lib/formato.js'
import { apiPublica, escudoEmbebido, marcoInstitucional } from '../src/lib/marcoCorreo.js'
import { botonesHtml, MARCA_BOTONES } from '../src/lib/respuestas.js'
import { como } from './api.js'

const TEXTO =
  'Apreciado(a) Luz Marina Burbano, Magíster en Educación:\n\nLa Revista Electrónica en Educación y Pedagogía la invita a evaluar el artículo «Alfabetización mediática en la formación de maestros», de la solicitud 2026-034.\n\nSi acepta, le enviaremos los documentos desde el OJS.\n\n' +
  `${MARCA_BOTONES}\n\nAgradecemos su valiosa colaboración.`

function correo() {
  return marcoInstitucional({
    tipo: 'invitacion',
    revista: 'Revista Electrónica en Educación y Pedagogía',
    contacto: 'reep@unicesmag.edu.co',
    contenido: aHtml(TEXTO, { marca: MARCA_BOTONES, html: botonesHtml(1) }),
    fecha: new Date(2026, 10, 12),
  })
}

describe('marco institucional del correo', () => {
  it('lleva el encabezado de la universidad, la franja con el mes, el contenido, el contacto y los avisos', () => {
    const html = correo()
    for (const parte of [
      'CESMAG',
      'HOMBRES NUEVOS',
      'Dependencia de Editorial',
      'Noviembre / 2026',
      'Invitación a evaluar un artículo',
      'Apreciado(a) Luz Marina Burbano',
      'Acepto la invitación',
      'Contacto',
      'reep@unicesmag.edu.co',
      'VIGILADA MINEDUCACIÓN',
      '#SomosUNICESMAG',
      'es confidencial',
      'Ley 1581 de 2012',
    ]) {
      expect(html).toContain(parte)
    }
    if (process.env.GUARDAR_CORREO) writeFileSync(process.env.GUARDAR_CORREO, html)
  })

  it('el escudo y la firma como imagen solo van cuando la API es alcanzable desde Internet', () => {
    expect(apiPublica('http://localhost:3000')).toBe(false)
    expect(apiPublica('https://192.168.1.5')).toBe(false)
    expect(apiPublica('http://editorial.unicesmag.edu.co')).toBe(false)
    expect(apiPublica('https://editorial.unicesmag.edu.co')).toBe(true)
    // pero el escudo de la universidad sale siempre, desde su propio sitio
    expect(correo()).toContain('https://www.unicesmag.edu.co/recursos/uploads/')
  })

  it('en la vista previa el escudo va incrustado, sin depender de la red', () => {
    const html = marcoInstitucional({ tipo: 'invitacion', revista: 'R', contacto: 'a@b.co', contenido: 'x', escudo: escudoEmbebido() })
    expect(html).toContain('src="data:image/png;base64,')
    expect(marcoInstitucional({ tipo: 'invitacion', revista: 'R', contacto: 'a@b.co', contenido: 'x', escudo: null })).not.toContain('<img')
  })
})

describe('vista previa del correo completo', () => {
  it('arma el correo con datos de ejemplo y el marco institucional, sin enlaces reales en los botones', async () => {
    const api = await como()
    const r = await api.post('/plantillas/vista-correo', {
      revista: 'reep',
      uso: 'invitacion',
      cuerpo: 'Apreciado(a) {{par}}: evalúe «{{articulo}}».\n\n{{botones}}',
    })
    expect(r.status).toBe(200)
    expect(r.body.html).toContain('Luz Marina Burbano')
    expect(r.body.html).toContain('Alfabetización mediática')
    expect(r.body.html).toContain('Acepto la invitación')
    expect(r.body.html).toContain('VIGILADA MINEDUCACIÓN')
    expect(r.body.html).not.toContain('/invitacion?token')
    expect(r.body.html).toContain('data:image/png;base64,')
    expect((await api.post('/plantillas/vista-correo', { revista: 'reep', uso: 'constancia', cuerpo: 'x' })).status).toBe(422)
  })
})

describe('vista previa del PDF de la constancia', () => {
  it('muestra el texto que se está editando, no solo el guardado', async () => {
    const api = await como()
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; clase: string }>
    const archivo = lista.find((p) => p.clase === 'archivo')
    const pdf = (cuerpo?: string) =>
      api.post(`/plantillas/${archivo?.id}/vista-previa`, cuerpo === undefined ? {} : { cuerpo }).buffer(true).parse((res, cb) => {
        const trozos: Buffer[] = []
        res.on('data', (t: Buffer) => trozos.push(t))
        res.on('end', () => cb(null, Buffer.concat(trozos)))
      })
    const guardado = await pdf()
    const borrador = await pdf('TEXTO DE BORRADOR {{par}}')
    expect(guardado.status).toBe(200)
    expect(borrador.status).toBe(200)
    expect((borrador.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-')
    expect((borrador.body as Buffer).length).not.toBe((guardado.body as Buffer).length)
    const correo = lista.find((p) => p.clase === 'correo')
    expect((await api.post(`/plantillas/${correo?.id}/vista-previa`, {})).status).toBe(409)
  })
})

describe('la vista previa de una plantilla nueva (en blanco)', () => {
  it('muestra el marco de la Universidad CESMAG sin contenido', async () => {
    const api = await como()
    for (const uso of ['invitacion', 'agradecimiento']) {
      const previa = await api.post('/plantillas/vista-correo', { revista: 'reep', uso, cuerpo: '' })
      expect(previa.status).toBe(200)
      expect(previa.body.html).toContain('CESMAG')
      expect(previa.body.html).toContain('VIGILADA MINEDUCACIÓN')
    }
  })
})

describe('el correo no lleva firma', () => {
  it('ni en el marco, ni en la vista previa, ni en Configuración', async () => {
    const api = await como()
    const previa = await api.post('/plantillas/vista-correo', { revista: 'reep', uso: 'agradecimiento', cuerpo: 'Texto de prueba' })
    expect(previa.body.html).toContain('Gracias por su evaluación')
    expect(previa.body.html).not.toContain('alt="Firma"')
    expect(previa.body.html).not.toContain('Mendoza')
    expect((await api.get('/configuracion')).body.revistas.reep).not.toHaveProperty('firmaNombre')
    expect((await api.put('/configuracion/revistas/reep/firma', { firmaNombre: 'x', firmaCargo: '' })).status).toBe(404)
  })
})
