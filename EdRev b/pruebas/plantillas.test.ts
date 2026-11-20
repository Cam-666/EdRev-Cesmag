/*
 * Pruebas de las plantillas (la constancia permanente, los correos de uso editable) y del formato del texto
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

type Api = Awaited<ReturnType<typeof como>>

/** La constancia de una revista: es única y permanente (no se crea ni se elimina), así que las pruebas usan la que ya existe. */
async function constancia(api: Api, revista = 'reep') {
  const c = (await api.get('/plantillas')).body.plantillas.find(
    (p: { revista: string; fin: string }) => p.revista === revista && p.fin === 'constancia',
  )
  expect(c).toBeTruthy()
  return c as { id: string; clase: string; uso: string | null; cuerpo: string; imagenes: Record<string, unknown> }
}

/** Deja la constancia como estaba: su texto original y sin imágenes. */
async function restaurar(api: Api, c: { id: string; cuerpo: string }) {
  await api.put(`/plantillas/${c.id}`, { asunto: null, cuerpo: c.cuerpo })
  for (const parte of ['encabezado', 'pie', 'firma']) await api.delete(`/plantillas/${c.id}/imagen/${parte}`)
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

describe('plantillas: constancia permanente y correos de uso editable', () => {
  it('una plantilla nueva solo pide el nombre y nace como correo libre; la constancia no se crea', async () => {
    const api = await como()
    const nombre = `Otro correo ${Date.now()}`
    const correo = await api.post('/plantillas', { revista: 'reep', nombre })
    expect(correo.status).toBe(201)
    expect(correo.body).toMatchObject({ clase: 'correo', fin: 'mensaje', uso: null, enUso: false, imagenes: null, cuerpo: '' })
    expect((await api.post('/plantillas', { revista: 'reep', nombre })).status).toBe(409) // el nombre no se repite
    // la constancia de cada revista es única: no se puede crear otra
    expect((await api.post('/plantillas', { revista: 'reep', nombre: 'Otra constancia', uso: 'constancia' })).status).toBe(409)
    expect((await api.post('/plantillas', { revista: 'reep', nombre: 'Otro archivo', clase: 'archivo' })).status).toBe(409)
    await api.delete(`/plantillas/${correo.body.id}`)
  })

  it('el uso de una plantilla de correo se cambia al editarla, salvo el de la que está en uso y el de la constancia', async () => {
    const api = await como()
    const nueva = (await api.post('/plantillas', { revista: 'ire', nombre: `Uso cambiante ${Date.now()}` })).body
    // libre: no acepta los botones de la invitación ni el número de solicitud
    expect((await api.put(`/plantillas/${nueva.id}`, { asunto: 'Hola', cuerpo: '{{nombre}}\n\n{{botones}}' })).status).toBe(422)
    // al pasarla a invitación sí los acepta (y deja de aceptar {{nombre}})
    const inv = await api.put(`/plantillas/${nueva.id}`, { asunto: 'Hola', cuerpo: '{{par}} {{articulo}}\n\n{{botones}}', fin: 'invitacion' })
    expect(inv.status).toBe(200)
    expect(inv.body).toMatchObject({ fin: 'invitacion', uso: null })
    expect(inv.body.variables).toContain('botones')
    expect((await api.put(`/plantillas/${nueva.id}`, { asunto: 'Hola', cuerpo: '{{nombre}}', fin: 'invitacion' })).status).toBe(422)
    // y de vuelta a libre
    const libre = await api.put(`/plantillas/${nueva.id}`, { asunto: 'Hola', cuerpo: 'Estimado(a) {{nombre}}', fin: 'mensaje' })
    expect(libre.body.fin).toBe('mensaje')
    // la que está en uso no cambia de uso: los correos automáticos se quedarían sin plantilla
    const enUso = (await api.get('/plantillas')).body.plantillas.find((p: { revista: string; uso: string }) => p.revista === 'ire' && p.uso === 'agradecimiento')
    const r = await api.put(`/plantillas/${enUso.id}`, { asunto: enUso.asunto, cuerpo: enUso.cuerpo, fin: 'mensaje' })
    expect(r.status).toBe(409)
    expect(r.body.mensaje).toContain('primero marque otra')
    // la constancia no cambia de uso
    const c = await constancia(api, 'ire')
    expect((await api.put(`/plantillas/${c.id}`, { asunto: null, cuerpo: c.cuerpo, fin: 'mensaje' })).status).toBe(409)
    await api.delete(`/plantillas/${nueva.id}`)
  })

  it('la constancia es permanente: siempre está en uso y no se elimina, pero se edita', async () => {
    const api = await como()
    for (const revista of ['reep', 'ire']) {
      const c = await constancia(api, revista)
      expect(c).toMatchObject({ clase: 'archivo', uso: 'constancia' })
      const borrar = await api.delete(`/plantillas/${c.id}`)
      expect(borrar.status).toBe(409)
      expect(borrar.body.mensaje).toContain('permanente')
    }
    const c = await constancia(api)
    expect((await api.put(`/plantillas/${c.id}`, { asunto: null, cuerpo: `${c.cuerpo}\n\nNota` })).status).toBe(200)
    await restaurar(api, c)
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
    // la anterior vuelve a quedar en uso y la otra se puede eliminar
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
    // dejar la revista como estaba
    const base = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; nombre: string }) => p.revista === 'reep' && p.nombre === 'Invitación a evaluar',
    )
    await api.post(`/plantillas/${base.id}/asignar`, { uso: 'invitacion' })
    await api.delete(`/plantillas/${c.id}`)
  })

  it('sube el encabezado, el pie y la firma como imagen, y no acepta otra cosa', async () => {
    const api = await como()
    const original = await constancia(api)
    const { id } = original
    for (const parte of ['encabezado', 'pie', 'firma']) {
      const r = await api.subir(`/plantillas/${id}/imagen/${parte}`, PNG, 'logo.png')
      expect(r.status).toBe(200)
      expect(r.body.imagenes[parte]).not.toBeNull()
    }
    const pdf = await api.subir(`/plantillas/${id}/imagen/pie`, Buffer.from('%PDF-1.4 no es imagen'), 'x.pdf')
    expect(pdf.status).toBe(422)
    const quitada = await api.delete(`/plantillas/${id}/imagen/firma`)
    expect(quitada.body.imagenes.firma).toBeNull()
    await restaurar(api, original)
    const correo = (await api.get('/plantillas')).body.plantillas.find((p: { clase: string }) => p.clase === 'correo')
    // Una plantilla de correo no lleva imágenes
    for (const parte of ['encabezado', 'pie', 'firma']) {
      expect((await api.subir(`/plantillas/${correo.id}/imagen/${parte}`, PNG, 'a.png')).status).toBe(409)
    }
  })

  it('la vista previa es un PDF y el texto acepta los marcadores de la constancia', async () => {
    const api = await como()
    const original = await constancia(api)
    const { id } = original
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
    await restaurar(api, original)
  })

  it('una plantilla nueva queda en blanco, sin imágenes ni firma', async () => {
    const api = await como()
    const c = (await api.post('/plantillas', { revista: 'ire', nombre: `Correo en blanco ${Date.now()}` })).body
    expect(c).toMatchObject({ cuerpo: '', asunto: '', imagenes: null })
    expect(c).not.toHaveProperty('correoFirma')
    const ok = await api.put(`/plantillas/${c.id}`, { asunto: 'Hola', cuerpo: 'Estimado(a) {{nombre}}' })
    expect(ok.status).toBe(200)
    await api.delete(`/plantillas/${c.id}`)
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
  it('nace en blanco, aunque ya haya una en uso, y no hereda su texto ni sus imágenes', async () => {
    const api = await como()
    const enUso = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; uso: string | null }) => p.revista === 'reep' && p.uso === 'invitacion',
    )
    expect(enUso.cuerpo).not.toBe('')
    const nombre = `Invitación de prueba ${Date.now()}`
    const r = await api.post('/plantillas', { revista: 'reep', nombre, uso: 'invitacion' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ clase: 'correo', fin: 'invitacion', uso: null, cuerpo: '', asunto: '' })
    // en blanco no se puede elegir; con texto sí, y entonces la anterior queda libre
    expect((await api.post(`/plantillas/${r.body.id}/asignar`, { uso: 'invitacion' })).status).toBe(422)
    expect((await api.put(`/plantillas/${r.body.id}`, { asunto: 'Asunto', cuerpo: 'Texto {{par}}' })).status).toBe(200)
    expect((await api.post(`/plantillas/${r.body.id}/asignar`, { uso: 'invitacion' })).status).toBe(200)
    const lista = (await api.get('/plantillas')).body.plantillas
    expect(lista.find((p: { id: string }) => p.id === enUso.id).uso).toBeNull()
    await api.post(`/plantillas/${enUso.id}/asignar`, { uso: 'invitacion' })
    await api.delete(`/plantillas/${r.body.id}`)
  })

  it('la constancia, sin texto ni imágenes, es un archivo en blanco; con la firma, esta se ve aunque el texto no tenga el marcador', async () => {
    const api = await como()
    const c = await constancia(api)
    const vista = await api.get(`/plantillas/${c.id}/vista-previa`)
    expect(vista.status).toBe(200)
    expect(vista.headers['content-type']).toContain('application/pdf')
    const { PDFDocument } = await import('pdf-lib')
    const { valoresDe, dibujarConstancia } = await import('../src/servicios/constanciaPdf.js')
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', issn: '', indexaciones: '' })
    const sola = await dibujarConstancia({ cuerpo: '', encabezado: null, pie: null, firma: null }, v)
    const conFirma = await dibujarConstancia({ cuerpo: '', encabezado: null, pie: null, firma: PNG }, v)
    expect((await PDFDocument.load(sola)).getPageCount()).toBe(1)
    expect(conFirma.length).toBeGreaterThan(sola.length)
  })

  it('la constancia se dibuja en hoja Carta, con el título «CERTIFICA QUE» más grande que el cuerpo', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', issn: '', indexaciones: '' })
    const pdf = await dibujarConstancia({ cuerpo: '[centro]**CERTIFICA QUE**\n\n[justificado]Texto del cuerpo.', encabezado: null, pie: null, firma: null }, v)
    const { width, height } = (await PDFDocument.load(pdf)).getPage(0).getSize()
    expect([width, height]).toEqual([612, 792])
  })

  it('una plantilla en blanco no se puede elegir y el mensaje lo explica', async () => {
    const api = await como()
    const c = await api.post('/plantillas', { revista: 'ire', nombre: `En blanco ${Date.now()}`, uso: 'invitacion' })
    expect(c.body.fin).toBe('invitacion')
    const r = await api.post(`/plantillas/${c.body.id}/asignar`, { uso: 'invitacion' })
    expect(r.status).toBe(422)
    expect(r.body.mensaje).toContain('aún no tiene texto')
    await api.delete(`/plantillas/${c.body.id}`)
  })
})
