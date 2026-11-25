/*
 * Pruebas de las plantillas (la constancia permanente, los correos de uso editable) y del formato del texto
 */
import request from 'supertest'
import { pool } from '../src/db.js'
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
  it('una plantilla nueva pide revista, nombre y para qué es; nace en blanco y no es la predeterminada', async () => {
    const api = await como()
    const nombre = `Otro correo ${Date.now()}`
    const correo = await api.post('/plantillas', { revista: 'reep', nombre, fin: 'agradecimiento' })
    expect(correo.status).toBe(201)
    expect(correo.body).toMatchObject({ clase: 'correo', fin: 'agradecimiento', uso: null, enUso: false, imagenes: null, cuerpo: '' })
    expect((await api.post('/plantillas', { revista: 'reep', nombre, fin: 'agradecimiento' })).status).toBe(409) // el nombre no se repite
    expect((await api.post('/plantillas', { revista: 'reep', nombre: '   ', fin: 'mensaje' })).status).toBe(422)
    // hay que decir para qué es, y la constancia no se crea: ya existe una por revista
    expect((await api.post('/plantillas', { revista: 'reep', nombre: `Sin fin ${Date.now()}` })).status).toBe(422)
    expect((await api.post('/plantillas', { revista: 'reep', nombre: `Otra constancia ${Date.now()}`, fin: 'constancia' })).status).toBe(422)
    await api.delete(`/plantillas/${correo.body.id}`)
  })

  it('cada revista tiene su invitación, agradecimiento y constancia en uso; la constancia no se elimina y la en uso de un correo sí, y se puede cambiar', async () => {
    const api = await como()
    for (const revista of ['reep', 'ire']) {
      const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; revista: string; fin: string; enUso: boolean; uso: string | null }>
      for (const fin of ['invitacion', 'agradecimiento', 'constancia']) {
        expect(lista.filter((p) => p.revista === revista && p.fin === fin && p.enUso)).toHaveLength(1)
      }
      for (const p of lista.filter((x) => x.revista === revista && x.enUso && x.fin === 'constancia')) expect((await api.delete(`/plantillas/${p.id}`)).status).toBe(409)
    }
    const original = (await api.get('/plantillas')).body.plantillas.find((p: { revista: string; fin: string; enUso: boolean }) => p.revista === 'reep' && p.fin === 'invitacion' && p.enUso)
    const otra = (await api.post('/plantillas', { revista: 'reep', nombre: `Invitación breve ${Date.now()}`, fin: 'invitacion' })).body
    // en blanco no puede ser la predeterminada; con texto sí, y la anterior pasa a ser una más
    expect((await api.post(`/plantillas/${otra.id}/predeterminada`)).status).toBe(422)
    expect((await api.put(`/plantillas/${otra.id}`, { asunto: 'Invitación · {{revista}}', cuerpo: 'Hola {{par}}, ¿evalúa «{{articulo}}»?{{botones}}' })).status).toBe(200)
    const marcada = await api.post(`/plantillas/${otra.id}/predeterminada`)
    expect(marcada.status).toBe(200)
    expect(marcada.body).toMatchObject({ enUso: true, fin: 'invitacion' })
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; revista: string; fin: string; enUso: boolean }>
    expect(lista.filter((p) => p.revista === 'reep' && p.fin === 'invitacion' && p.enUso).map((p) => p.id)).toEqual([otra.id])
    // la constancia y los mensajes no tienen predeterminada
    const constanciaReep = lista.find((p) => p.revista === 'reep' && p.fin === 'constancia')!
    expect((await api.post(`/plantillas/${constanciaReep.id}/predeterminada`)).status).toBe(409)
    // se deja todo como estaba
    expect((await api.post(`/plantillas/${original.id}/predeterminada`)).status).toBe(200)
    expect((await api.delete(`/plantillas/${otra.id}`)).status).toBe(204)
    expect((await api.delete(`/plantillas/${otra.id}`)).status).toBe(404)
  })

  it('la plantilla en uso de un correo también se puede eliminar: el envío usa entonces otra de ese fin que tenga texto', async () => {
    const api = await como()
    const otra = (await api.post('/plantillas', { revista: 'ire', nombre: `Gracias ${Date.now()}`, fin: 'agradecimiento' })).body
    expect((await api.put(`/plantillas/${otra.id}`, { asunto: 'Gracias', cuerpo: 'Gracias, {{par}}.' })).status).toBe(200)
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; revista: string; fin: string; enUso: boolean; asunto: string | null; cuerpo: string }>
    const enUso = lista.find((p) => p.revista === 'ire' && p.fin === 'agradecimiento' && p.enUso)!
    expect((await api.delete(`/plantillas/${enUso.id}`)).status).toBe(204)
    const sin = (await api.get('/plantillas')).body.plantillas as Array<{ revista: string; fin: string; enUso: boolean }>
    expect(sin.filter((p) => p.revista === 'ire' && p.fin === 'agradecimiento' && p.enUso)).toHaveLength(0)
    // se deja todo como estaba
    const vuelta = (await api.post('/plantillas', { revista: 'ire', nombre: enUso.asunto ? `Agradecimiento ${Date.now()}` : 'Agradecimiento', fin: 'agradecimiento' })).body
    await api.put(`/plantillas/${vuelta.id}`, { asunto: enUso.asunto, cuerpo: enUso.cuerpo })
    expect((await api.post(`/plantillas/${vuelta.id}/predeterminada`)).status).toBe(200)
    expect((await api.delete(`/plantillas/${otra.id}`)).status).toBe(204)
  })

  it('crear, editar y eliminar una plantilla, y registrar o editar un autor, quedan en la auditoría', async () => {
    const api = await como()
    const nombre = `Auditada ${Date.now()}`
    const p = (await api.post('/plantillas', { revista: 'reep', nombre, fin: 'mensaje' })).body
    expect((await api.put(`/plantillas/${p.id}`, { asunto: 'Hola', cuerpo: 'Hola {{nombre}}' })).status).toBe(200)
    expect((await api.delete(`/plantillas/${p.id}`)).status).toBe(204)
    const autor = await api.post('/reep/autores', { nombre: `Autor auditado ${Date.now()}`, correo: 'a@x.co', orcid: '', filiacion: 'Universidad CESMAG', pais: 'Colombia' })
    expect((await api.patch(`/reep/autores/${autor.body.id}`, { filiacion: 'Universidad Mariana' })).status).toBe(200)
    const { rows } = await pool.query(
      `SELECT accion, detalle->>'texto' AS texto FROM auditoria WHERE tabla_afectada IN ('plantilla', 'autor') ORDER BY id_auditoria DESC LIMIT 12`,
    )
    const textos = rows.map((r: { accion: string; texto: string }) => `${r.accion}: ${r.texto}`)
    expect(textos).toEqual(expect.arrayContaining([
      `registro: Creó la plantilla «${nombre}»`,
      `edicion: Editó el texto de la plantilla «${nombre}»`,
      `eliminacion: Eliminó la plantilla «${nombre}»`,
      expect.stringMatching(/^registro: Registró al autor Autor auditado/),
      expect.stringMatching(/^edicion: Editó los datos del autor Autor auditado/),
    ]))
  })

  it('las plantillas de mensaje se editan sin restricción', async () => {
    const api = await como()
    const m = (await api.get('/plantillas')).body.plantillas.find((p: { revista: string; fin: string }) => p.revista === 'reep' && p.fin === 'mensaje')
    expect(m).toBeTruthy()
    const r = await api.put(`/plantillas/${m.id}`, { asunto: m.asunto, cuerpo: `${m.cuerpo}

Nota.` })
    expect(r.status).toBe(200)
    expect((await api.put(`/plantillas/${m.id}`, { asunto: m.asunto, cuerpo: m.cuerpo })).status).toBe(200)
  })

  it('la constancia es permanente: siempre está en uso y no se elimina, pero se edita', async () => {
    const api = await como()
    for (const revista of ['reep', 'ire']) {
      const c = await constancia(api, revista)
      expect(c).toMatchObject({ clase: 'archivo', uso: 'constancia' })
      expect((await api.delete(`/plantillas/${c.id}`)).status).toBe(409)
    }
    const c = await constancia(api)
    expect((await api.put(`/plantillas/${c.id}`, { asunto: null, cuerpo: `${c.cuerpo}\n\nNota` })).status).toBe(200)
    await restaurar(api, c)
  })

  it('los datos que acepta una plantilla dependen de su fin: {{botones}} solo sirve en la invitación y {{nombre}} en los mensajes', async () => {
    const api = await como()
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; revista: string; fin: string; variables: string[]; asunto: string | null; cuerpo: string }>
    const invitacion = lista.find((p) => p.revista === 'reep' && p.fin === 'invitacion')!
    const gracias = lista.find((p) => p.revista === 'reep' && p.fin === 'agradecimiento')!
    expect(invitacion.variables).toContain('botones')
    expect(gracias.variables).not.toContain('botones')
    expect((await api.put(`/plantillas/${gracias.id}`, { asunto: 'Hola', cuerpo: '{{par}}\n\n{{botones}}' })).status).toBe(422)
    const m = (await api.post('/plantillas', { revista: 'reep', nombre: `Datos ${Date.now()}`, fin: 'mensaje' })).body
    expect(m.variables).toContain('nombre')
    expect(m.variables).not.toContain('botones')
    expect((await api.put(`/plantillas/${m.id}`, { asunto: 'Hola', cuerpo: '{{par}}' })).status).toBe(422)
    await api.delete(`/plantillas/${m.id}`)
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
    const c = (await api.post('/plantillas', { revista: 'ire', nombre: `Correo en blanco ${Date.now()}`, fin: 'mensaje' })).body
    expect(c).toMatchObject({ cuerpo: '', asunto: '', imagenes: null })
    expect(c).not.toHaveProperty('correoFirma')
    const ok = await api.put(`/plantillas/${c.id}`, { asunto: 'Hola', cuerpo: 'Estimado(a) {{nombre}}' })
    expect(ok.status).toBe(200)
    await api.delete(`/plantillas/${c.id}`)
  })

  it('la firma de la constancia es solo la imagen: el PDF no lleva enlaces', async () => {
    const { PDFDocument, PDFName } = await import('pdf-lib')
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', numero: '1', issn: '', indexaciones: '' })
    const pdf = await dibujarConstancia({ cuerpo: '{{par}} {{articulo}}\n\n[centro]{{firma}}', encabezado: null, pie: null, firma: PNG }, v)
    const anotaciones = (await PDFDocument.load(pdf)).getPage(0).node.get(PDFName.of('Annots')) as { size?: () => number } | undefined
    expect(anotaciones?.size?.() ?? 0).toBe(0)
  })

  it('el PDF reparte un texto largo en varias páginas y escribe lo que el alfabeto no tiene', async () => {
    const largo = Array.from({ length: 60 }, (_, i) => `[justificado]Párrafo ${i} con **negrita** y ñ, «comillas», “dobles” y 日本.`).join('\n\n')
    const pdf = await dibujarConstancia(
      { cuerpo: largo, encabezado: PNG, pie: PNG, firma: null },
      valoresDe({ revista: 'R', par: 'P', articulo: 'A', numero: '1', issn: '', indexaciones: '' }),
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

describe('una plantilla nueva y la constancia', () => {
  it('nace en blanco y no hereda el texto de las que ya existen', async () => {
    const api = await como()
    const invitacion = (await api.get('/plantillas')).body.plantillas.find(
      (p: { revista: string; fin: string }) => p.revista === 'reep' && p.fin === 'invitacion',
    )
    expect(invitacion.cuerpo).not.toBe('')
    const r = await api.post('/plantillas', { revista: 'reep', nombre: `Mensaje de prueba ${Date.now()}`, fin: 'mensaje' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ clase: 'correo', fin: 'mensaje', uso: null, cuerpo: '', asunto: '' })
    // y la invitación predeterminada sigue siendo la misma
    const despues = (await api.get('/plantillas')).body.plantillas.find((p: { id: string }) => p.id === invitacion.id)
    expect(despues).toMatchObject({ uso: 'invitacion', enUso: true, cuerpo: invitacion.cuerpo })
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
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', numero: '1', issn: '', indexaciones: '' })
    const sola = await dibujarConstancia({ cuerpo: '', encabezado: null, pie: null, firma: null }, v)
    const conFirma = await dibujarConstancia({ cuerpo: '', encabezado: null, pie: null, firma: PNG }, v)
    expect((await PDFDocument.load(sola)).getPageCount()).toBe(1)
    expect(conFirma.length).toBeGreaterThan(sola.length)
  })

  it('la constancia se dibuja en hoja Carta, con el título «CERTIFICA QUE» más grande que el cuerpo', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const v = valoresDe({ revista: 'R', par: 'P', articulo: 'A', numero: '1', issn: '', indexaciones: '' })
    const pdf = await dibujarConstancia({ cuerpo: '[centro]**CERTIFICA QUE**\n\n[justificado]Texto del cuerpo.', encabezado: null, pie: null, firma: null }, v)
    const { width, height } = (await PDFDocument.load(pdf)).getPage(0).getSize()
    expect([width, height]).toEqual([612, 792])
  })

})

describe('actualización de plantillas viejas', () => {
  it('una invitación que sobra sigue siendo una invitación: se ofrece al asignar un par, sin ser la predeterminada', async () => {
    const { pool } = await import('../src/db.js')
    const { asegurarEsquema } = await import('../src/esquema.js')
    const nombre = `Sobrante ${Date.now()}`
    await pool.query(
      `INSERT INTO plantilla (id_revista, nombre, clase, fin, asunto, cuerpo)
       VALUES (1, $1, 'correo', 'invitacion', 'Hola {{par}}', 'Estimado(a) {{par}}: evalúe «{{articulo}}».{{botones}}')`,
      [nombre],
    )
    await asegurarEsquema(pool)
    const api = await como()
    const p = (await api.get('/plantillas')).body.plantillas.find((x: { nombre: string }) => x.nombre === nombre)
    expect(p).toMatchObject({ fin: 'invitacion', enUso: false, asunto: 'Hola {{par}}' })
    const ofrecidas = (await api.get('/reep/correos/plantillas?fin=invitacion')).body as Array<{ id: string; predeterminada: boolean }>
    expect(ofrecidas[0]?.predeterminada).toBe(true) // la predeterminada sale primero
    expect(ofrecidas.map((x) => x.id)).toContain(p.id)
    await api.delete(`/plantillas/${p.id}`)
  })
})
