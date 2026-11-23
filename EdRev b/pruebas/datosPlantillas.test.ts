/*
 * Pruebas de los datos que se pueden insertar en las plantillas (invitación, agradecimiento y mensaje libre), del
 * formato (cursiva y renglones en blanco) y de la constancia con la disposición de la que entrega la dependencia.
 */
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { analizar, aHtml } from '../src/lib/formato.js'
import { TEXTO_CONSTANCIA } from '../src/lib/textoConstancia.js'
import { dibujarConstancia, valoresDe } from '../src/servicios/constanciaPdf.js'
import { como } from './api.js'

const unico = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

describe('datos de las plantillas', () => {
  it('la invitación ofrece los datos de la estructura original y los del proceso; el mensaje libre, muchos más', async () => {
    const api = await como()
    const { plantillas } = (await api.get('/plantillas')).body as { plantillas: Array<{ fin: string; variables: string[] }> }
    const de = (fin: string) => plantillas.find((p) => p.fin === fin)?.variables ?? []
    // Estructura original: revista, par, artículo y fecha.
    expect(de('invitacion')).toEqual(expect.arrayContaining(['revista', 'par', 'articulo', 'fecha', 'botones', 'plazo', 'limite']))
    expect(de('agradecimiento')).toEqual(expect.arrayContaining(['revista', 'par', 'articulo', 'fecha', 'entrega', 'numero']))
    expect(de('mensaje').length).toBeGreaterThanOrEqual(18)
    expect(de('mensaje')).toEqual(expect.arrayContaining(['nombre', 'correo', 'orcid', 'pais', 'articulo', 'estado', 'contacto']))
  })

  it('la vista previa reemplaza los datos nuevos con valores reales de la revista', async () => {
    const api = await como()
    const r = await api.post('/reep/correos/vista-previa', {
      fin: 'invitacion',
      cuerpo: 'Tiene {{plazo}} (hasta el {{limite}}) · {{tipo}} · {{PAR}} · {{contacto}} · ISSN {{issn}}',
    })
    expect(r.status).toBe(200)
    expect(r.body.html).toMatch(/Tiene \d+ días \(hasta el \d+ de \w+ de \d{4}\)/)
    expect(r.body.html).toContain('Investigación · LUZ MARINA BURBANO')
    expect(r.body.html).toContain('ISSN 2590-7476')
  })

  it('un mensaje a un autor trae su ORCID, su país y su artículo más reciente en la revista', async () => {
    const api = await como()
    const correo = `autor${unico()}@x.co`
    const titulo = `Artículo para el mensaje ${unico()}`
    const art = await api.post('/reep/articulos', {
      numeroOjs: `M-${unico()}`,
      titulo,
      tipo: 'reflexion',
      fechaPostulacion: '2026-10-02',
      autores: [{ nuevo: { nombre: `Autora Mensaje ${unico()}`, correo, orcid: '', filiacion: 'Universidad Mariana', pais: 'Ecuador' } }],
    })
    expect(art.status).toBe(201)
    const idAutor = art.body.autores[0].id as string
    const plantilla = await api.post('/plantillas', { revista: 'reep', nombre: `Aviso ${unico()}`, fin: 'mensaje' })
    const editada = await api.put(`/plantillas/${plantilla.body.id}`, {
      asunto: 'Sobre {{articulo}}',
      cuerpo: '{{NOMBRE}} ({{correo}}), de {{universidad}}, {{pais}}: su artículo «{{articulo}}» ({{tipo}}) está {{estado}}.',
    })
    expect(editada.status).toBe(200)
    const previa = await api.post('/reep/mensajes/vista-previa', { destino: { tipo: 'autor', id: idAutor }, plantillaId: plantilla.body.id })
    expect(previa.status).toBe(200)
    expect(previa.body.asunto).toBe(`Sobre ${titulo}`)
    expect(previa.body.html).toContain(`(${correo}), de Universidad Mariana, Ecuador`)
    expect(previa.body.html).toContain('(Reflexión) está Postulado')
    await api.delete(`/plantillas/${plantilla.body.id}`)
  })
})

describe('formato del texto', () => {
  it('__texto__ es cursiva (también junto a la negrita) y dos líneas en blanco dejan un renglón vacío', () => {
    const p = analizar('**__Ambas__** y __cursiva__\n\n\n\nDespués de un renglón\n\n\n\n')
    expect(p).toHaveLength(3)
    expect(p[0]?.lineas[0]?.[0]).toEqual({ texto: 'Ambas', negrita: true, cursiva: true })
    expect(p[1]?.vacio).toBe(true)
    expect(aHtml('__Proyectó__: x')).toContain('<i>Proyectó</i>: x')
  })
})

describe('constancia', () => {
  it('sigue la disposición de la constancia de la dependencia: una hoja Carta, cursiva para «Proyectó»', async () => {
    const pdf = await dibujarConstancia(
      { cuerpo: TEXTO_CONSTANCIA, encabezado: null, pie: null, firma: null },
      valoresDe({ revista: 'Revista Electrónica en Educación y Pedagogía', par: 'Diana Quirá', articulo: 'Título', issn: '2590-7476', indexaciones: 'Redalyc' }),
    )
    const doc = await PDFDocument.load(pdf)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 })
    const objetos = doc.context.enumerateIndirectObjects().map(([, o]) => o.toString()).join(' ')
    expect(objetos).toContain('/Helvetica-Oblique')
    expect(objetos).toContain('/Helvetica-Bold')
  })
})
