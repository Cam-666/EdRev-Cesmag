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
  return r.body as { id: string; clase: string; uso: string | null }
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
    expect(a).toMatchObject({ clase: 'archivo', uso: null })
    const correo = await api.post('/plantillas', { revista: 'reep', nombre: 'Otro correo', clase: 'correo' })
    expect(correo.body).toMatchObject({ clase: 'correo', uso: null, enUso: false, imagenes: null })
    expect((await api.post('/plantillas', { revista: 'reep', nombre: 'Otro correo', clase: 'correo' })).status).toBe(409)
  })

  it('la plantilla se elige para su fin: reemplaza a la anterior, no sirve para otro fin y una plantilla en uso no se elimina', async () => {
    const api = await como()
    const correo = (await api.post('/plantillas', { revista: 'ire', nombre: 'Recordatorio amable', uso: 'agradecimiento' })).body
    expect(correo).toMatchObject({ fin: 'agradecimiento', uso: null })
    const antes = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; uso: string }) => p.revista === 'ire' && p.uso === 'agradecimiento',
    )
    await api.put(`/plantillas/${correo.id}`, { asunto: 'Hola', cuerpo: '{{par}} {{articulo}}' })
    // es de agradecimiento: no sirve como constancia ni como invitación
    expect((await api.post(`/plantillas/${correo.id}/asignar`, { uso: 'constancia' })).status).toBe(409)
    expect((await api.post(`/plantillas/${correo.id}/asignar`, { uso: 'invitacion' })).status).toBe(409)
    const ok = await api.post(`/plantillas/${correo.id}/asignar`, { uso: 'agradecimiento' })
    expect(ok.body).toMatchObject({ uso: 'agradecimiento', enUso: true })
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; revista: string; uso: string | null }>
    expect(lista.filter((p) => p.revista === 'ire' && p.uso === 'agradecimiento')).toHaveLength(1)
    expect(lista.find((p) => p.id === antes.id)?.uso).toBeNull()
    expect((await api.delete(`/plantillas/${correo.id}`)).status).toBe(409)
    // the previous one goes back and the other can be removed
    await api.post(`/plantillas/${antes.id}/asignar`, { uso: 'agradecimiento' })
    expect((await api.delete(`/plantillas/${correo.id}`)).status).toBe(204)
    expect((await api.delete(`/plantillas/${correo.id}`)).status).toBe(404)
  })

  it('los datos que acepta una plantilla dependen de su fin: {{botones}} solo sirve en la invitación', async () => {
    const api = await como()
    const gracias = (await api.post('/plantillas', { revista: 'reep', nombre: 'Gracias con botones', uso: 'agradecimiento' })).body
    expect(gracias.variables).not.toContain('botones')
    expect((await api.put(`/plantillas/${gracias.id}`, { asunto: 'Hola', cuerpo: '{{par}}\n\n{{botones}}' })).status).toBe(422)
    await api.delete(`/plantillas/${gracias.id}`)
    const c = (await api.post('/plantillas', { revista: 'reep', nombre: 'Con botones', uso: 'invitacion' })).body
    expect(c.variables).toContain('botones')
    await api.put(`/plantillas/${c.id}`, { asunto: 'Hola', cuerpo: '{{par}} {{articulo}}\n\n{{botones}}' })
    expect((await api.post(`/plantillas/${c.id}/asignar`, { uso: 'invitacion' })).status).toBe(200)
    // leave the journal as it was
    const base = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; nombre: string }) => p.revista === 'reep' && p.nombre === 'Invitación a evaluar',
    )
    await api.post(`/plantillas/${base.id}/asignar`, { uso: 'invitacion' })
    await api.delete(`/plantillas/${c.id}`)
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
    // A mail template carries no images at all
    for (const parte of ['encabezado', 'pie', 'firma']) {
      expect((await api.subir(`/plantillas/${correo.id}/imagen/${parte}`, PNG, 'a.png')).status).toBe(409)
    }
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

  it('una plantilla nueva queda en blanco', async () => {
    const api = await como()
    const a = (await api.post('/plantillas', { revista: 'ire', nombre: 'Archivo en blanco', clase: 'archivo' })).body
    expect(a).toMatchObject({ cuerpo: '', imagenes: { encabezado: null, pie: null, firma: null } })
    const c = (await api.post('/plantillas', { revista: 'ire', nombre: 'Correo en blanco', clase: 'correo' })).body
    expect(c).toMatchObject({ cuerpo: '', asunto: '' })
    expect(a).not.toHaveProperty('correoFirma')
    const ok = await api.put(`/plantillas/${a.id}`, { asunto: null, cuerpo: '{{par}} {{articulo}}' })
    expect(ok.status).toBe(200)
  })

  it('la firma de la constancia es solo la imagen: el PDF no lleva enlaces', async () => {
    const { PDFDocument, PDFName } = await import('pdf-lib')
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', issn: '', indexaciones: '' })
    const pdf = await dibujarConstancia({ cuerpo: '{{par}} {{articulo}}\n\n[centro]{{firma}}', encabezado: null, pie: null, firma: PNG }, v)
    const anotaciones = (await PDFDocument.load(pdf)).getPage(0).node.get(PDFName.of('Annots')) as { size?: () => number } | undefined
    expect(anotaciones?.size?.() ?? 0).toBe(0)
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
    expect(r.body).toMatchObject({ issn: '2590-7476', indexaciones: 'Publindex (categoría B), Scopus' })
    expect((await api.get('/configuracion')).body.revistas.reep.indexaciones).toContain('Scopus')
    await api.put('/configuracion/revistas/reep', { issn: inicial.reep.issn, indexaciones: inicial.reep.indexaciones })
    const vacio = await api.put('/configuracion/revistas/ire', { issn: '', indexaciones: '' })
    expect(vacio.body).toMatchObject({ issn: '', indexaciones: '' })
    await api.put('/configuracion/revistas/ire', { issn: inicial.ire.issn, indexaciones: inicial.ire.indexaciones })
  })
})

describe('crear una plantilla eligiendo para qué sirve', () => {
  it('nace como copia de la que está en uso y aparece para elegirla en Configuración', async () => {
    const api = await como()
    const enUso = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; uso: string | null }) => p.revista === 'reep' && p.uso === 'invitacion',
    )
    const nombre = `Invitación de prueba ${Date.now()}`
    const r = await api.post('/plantillas', { revista: 'reep', nombre, uso: 'invitacion' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ clase: 'correo', uso: null, cuerpo: enUso.cuerpo, asunto: enUso.asunto })
    // sigue sin uso hasta que se elija, y se puede elegir (tiene texto)
    expect((await api.post(`/plantillas/${r.body.id}/asignar`, { uso: 'invitacion' })).status).toBe(200)
    // la anterior queda libre
    const lista = (await api.get('/plantillas')).body.plantillas
    expect(lista.find((p: { id: string }) => p.id === enUso.id).uso).toBeNull()
    await api.post(`/plantillas/${enUso.id}/asignar`, { uso: 'invitacion' })
  })

  it('«usar desde ahora» la deja en uso de una vez; una constancia copia también sus imágenes', async () => {
    const api = await como()
    const actual = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; uso: string | null }) => p.revista === 'reep' && p.uso === 'constancia',
    )
    await api.subir(`/plantillas/${actual.id}/imagen/encabezado`, PNG, 'encabezado.png')
    const r = await api.post('/plantillas', {
      revista: 'reep',
      nombre: `Constancia de prueba ${Date.now()}`,
      uso: 'constancia',
      usarAhora: true,
    })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ clase: 'archivo', uso: 'constancia', enUso: true })
    expect(r.body.imagenes.encabezado).not.toBeNull()
    // se devuelve la original al uso
    await api.post(`/plantillas/${actual.id}/asignar`, { uso: 'constancia' })
    await api.delete(`/plantillas/${actual.id}/imagen/encabezado`)
  })

  it('una plantilla en blanco no se puede elegir y el mensaje lo explica', async () => {
    const api = await como()
    const c = await api.post('/plantillas', { revista: 'ire', nombre: `En blanco ${Date.now()}`, clase: 'correo' })
    expect(c.body.fin).toBe('invitacion')
    const r = await api.post(`/plantillas/${c.body.id}/asignar`, { uso: 'invitacion' })
    expect(r.status).toBe(422)
    expect(r.body.mensaje).toContain('aún no tiene texto')
  })
})
