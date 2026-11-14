/*
 * Pruebas de las plantillas de archivo (la constancia) y del formato del texto — RF-30, RF-45.
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { analizar, aHtml, textoPlano } from '../src/lib/formato.js'
import { dibujarConstancia, valoresDe } from '../src/servicios/constanciaPdf.js'
import { como } from './api.js'

// 1×1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

async function archivo(api: Awaited<ReturnType<typeof como>>, nombre: string) {
  const r = await api.post('/plantillas', { revista: 'reep', nombre, clase: 'archivo' })
  expect(r.status).toBe(201)
  return r.body as { id: string; clase: string; uso: string }
}

describe('formato del texto', () => {
  it('lee la alineación del párrafo y la negrita', () => {
    const p = analizar('[centro]**Título**\n\n[justificado]Texto con **negrita** en medio.\n\nSin marca')
    expect(p.map((x) => x.alineacion)).toEqual(['centro', 'justificado', 'izquierda'])
    expect(p[1]?.lineas[0]?.map((t) => t.negrita)).toEqual([false, true, false])
    expect(textoPlano('[centro]**A** b')).toBe('A b')
  })

  it('en el correo, la alineación y la negrita pasan a HTML y los botones no quedan dentro de un párrafo', () => {
    const html = aHtml('[derecha]Hola **mundo** <b>\n\n@@B@@', { marca: '@@B@@', html: '<table>botones</table>' })
    expect(html).toContain('text-align:right')
    expect(html).toContain('<b>mundo</b>')
    expect(html).toContain('&lt;b&gt;') // el texto se escapa
    expect(html.endsWith('<table>botones</table>')).toBe(true)
  })
})

describe('plantillas de archivo (constancia)', () => {
  it('se crea de clase «archivo» o «correo» y el nombre es libre', async () => {
    const api = await como()
    const a = await archivo(api, 'Constancia con logo nuevo')
    expect(a).toMatchObject({ clase: 'archivo', uso: 'constancia' })
    const sinUso = await api.post('/plantillas', { revista: 'reep', nombre: 'Otro correo', clase: 'correo' })
    expect(sinUso.status).toBe(422)
    const correo = await api.post('/plantillas', { revista: 'reep', nombre: 'Otro correo', clase: 'correo', uso: 'invitacion' })
    expect(correo.body).toMatchObject({ clase: 'correo', uso: 'invitacion', imagenes: null })
    expect((await api.post('/plantillas', { revista: 'reep', nombre: 'Otro correo', clase: 'correo', uso: 'invitacion' })).status).toBe(409)
  })

  it('sube el encabezado, el pie y la firma como imagen, y no acepta otra cosa', async () => {
    const api = await como()
    const { id } = await archivo(api, 'Constancia con imágenes')
    for (const parte of ['encabezado', 'pie', 'firma']) {
      const r = await api.subir(`/plantillas/${id}/imagen/${parte}`, PNG, 'logo.png')
      expect(r.status).toBe(200)
      expect(r.body.imagenes[parte]).not.toBeNull()
    }
    const pdf = await api.subir(`/plantillas/${id}/imagen/pie`, Buffer.from('%PDF-1.4 no es imagen'), 'x.pdf')
    expect(pdf.status).toBe(422)
    const quitada = await api.delete(`/plantillas/${id}/imagen/firma`)
    expect(quitada.body.imagenes.firma).toBeNull()
    const correo = (await api.get('/plantillas')).body.plantillas.find((p: { clase: string }) => p.clase === 'correo')
    expect((await api.subir(`/plantillas/${correo.id}/imagen/pie`, PNG, 'a.png')).status).toBe(409)
  })

  it('la vista previa es un PDF y el texto acepta los marcadores de la constancia', async () => {
    const api = await como()
    const { id } = await archivo(api, 'Constancia vista previa')
    await api.subir(`/plantillas/${id}/imagen/encabezado`, PNG, 'e.png')
    const ok = await api.put(`/plantillas/${id}`, {
      asunto: null,
      cuerpo: '[centro]**{{PAR}}**\n\n[justificado]{{articulo}} — {{issn}} — {{indexaciones}} — {{fecha}} {{anio}}\n\n[centro]{{firma}}',
    })
    expect(ok.status).toBe(200)
    const vista = await api.get(`/plantillas/${id}/vista-previa`)
    expect(vista.status).toBe(200)
    expect(vista.headers['content-type']).toContain('application/pdf')
    expect(Number(vista.headers['content-length'])).toBeGreaterThan(500)
    expect((await api.put(`/plantillas/${id}`, { asunto: null, cuerpo: '{{PAR}} y {{articulo}} {{inventado}}' })).status).toBe(422)
    expect((await request((await import('./api.js')).app).get(`/api/plantillas/${id}/vista-previa`)).status).toBe(401)
  })

  it('el PDF reparte un texto largo en varias páginas y escribe lo que el alfabeto no tiene', async () => {
    const largo = Array.from({ length: 60 }, (_, i) => `[justificado]Párrafo ${i} con **negrita** y ñ, «comillas», “dobles” y 日本.`).join('\n\n')
    const pdf = await dibujarConstancia(
      { cuerpo: largo, encabezado: PNG, pie: PNG, firma: null },
      valoresDe({ revista: 'R', par: 'P', articulo: 'A', issn: '', indexaciones: '' }),
    )
    const { PDFDocument } = await import('pdf-lib')
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1)
  })
})

describe('ISSN e indexaciones de cada revista (Configuración)', () => {
  it('las edita la Administradora y se ven en la configuración', async () => {
    const api = await como()
    const inicial = (await api.get('/configuracion')).body.revistas
    expect(inicial.reep.indexaciones).toContain('Publindex')
    expect(inicial.ire.issn).toBe('2357-5239')
    expect((await api.put('/configuracion/revistas/reep', { issn: '12', indexaciones: 'X' })).status).toBe(422)
    const r = await api.put('/configuracion/revistas/reep', { issn: '2590-7476', indexaciones: 'Publindex (categoría B), Scopus' })
    expect(r.body).toEqual({ issn: '2590-7476', indexaciones: 'Publindex (categoría B), Scopus' })
    expect((await api.get('/configuracion')).body.revistas.reep.indexaciones).toContain('Scopus')
    await api.put('/configuracion/revistas/reep', { issn: inicial.reep.issn, indexaciones: inicial.reep.indexaciones })
    const vacio = await api.put('/configuracion/revistas/ire', { issn: '', indexaciones: '' })
    expect(vacio.body).toEqual({ issn: '', indexaciones: '' })
    await api.put('/configuracion/revistas/ire', { issn: inicial.ire.issn, indexaciones: inicial.ire.indexaciones })
  })
})
