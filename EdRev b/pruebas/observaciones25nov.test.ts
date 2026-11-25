/*
 * Pruebas de los ajustes pedidos por la dependencia: el número de OJS en la constancia, mensajes escritos al
 * momento de enviar (sin guardarlos como plantilla), el indicador «Artículos sin pares» y el listado del informe.
 */
import { describe, expect, it } from 'vitest'
import { articuloAprobado, candidato, como } from './api.js'

const unico = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

describe('plantillas', () => {
  it('la constancia acepta el número de OJS y lo dibuja en la vista previa', async () => {
    const api = await como()
    const lista = (await api.get('/plantillas')).body.plantillas as Array<{ id: string; fin: string; revista: string; cuerpo: string; variables: string[] }>
    const constancia = lista.find((p) => p.fin === 'constancia' && p.revista === 'reep')
    expect(constancia?.variables).toContain('numero')
    for (const fin of ['invitacion', 'agradecimiento', 'mensaje']) {
      expect(lista.find((p) => p.fin === fin)?.variables).toContain('numero')
    }
    const previa = await api.post(`/plantillas/${constancia!.id}/vista-previa`, { cuerpo: 'Solicitud {{numero}}' })
    expect(previa.status).toBe(200)
  })
})

describe('mensaje escrito al momento de enviar', () => {
  async function autor() {
    const api = await como()
    const r = await api.post('/reep/autores', { nombre: `Autora Libre ${unico()}`, correo: `libre${unico()}@ejemplo.edu.co`, orcid: '', filiacion: 'Universidad de Nariño', pais: 'Colombia' })
    expect(r.status).toBe(201)
    return { id: r.body.id as string, nombre: r.body.nombre as string }
  }

  it('se previsualiza y se envía con los datos de la persona, sin crear una plantilla', async () => {
    const api = await como()
    const a = await autor()
    const antes = (await api.get('/plantillas')).body.plantillas.length
    const texto = { asunto: 'Aviso para {{nombre}}', cuerpo: 'Estimada {{nombre}}:\n\nLe escribimos desde {{revista}}.' }
    const previa = await api.post('/reep/mensajes/vista-previa', { destino: { tipo: 'autor', id: a.id }, texto })
    expect(previa.status).toBe(200)
    expect(previa.body.asunto).toBe(`Aviso para ${a.nombre}`)
    expect(previa.body.html).toContain('Revista Electrónica en Educación y Pedagogía')

    const enviado = await api.post('/reep/mensajes', { destino: { tipo: 'autor', id: a.id }, texto })
    expect(enviado.status).toBe(201)
    const registro = (await api.get('/reep/correos?tipo=mensaje&porPagina=100')).body.items as Array<{ id: string; asunto: string }>
    expect(registro.find((c) => c.id === enviado.body.id)?.asunto).toBe(`Aviso para ${a.nombre}`)
    expect((await api.get('/plantillas')).body.plantillas.length).toBe(antes)
    const aud = (await api.get('/auditoria?porPagina=20')).body.items as Array<{ accion: string }>
    expect(aud.some((x) => x.accion.includes('mensaje escrito al momento'))).toBe(true)
  })

  it('sin texto, con un dato que no existe, o con plantilla y texto a la vez, se rechaza', async () => {
    const api = await como()
    const a = await autor()
    const destino = { tipo: 'autor', id: a.id }
    expect((await api.post('/reep/mensajes', { destino, texto: { asunto: 'Hola', cuerpo: '  ' } })).status).toBe(422)
    expect((await api.post('/reep/mensajes', { destino, texto: { asunto: '', cuerpo: 'Hola {{firma}}' } })).status).toBe(422)
    const plantilla = ((await api.get('/reep/mensajes/plantillas')).body as Array<{ id: string; asunto: string; cuerpo: string }>)[0]
    expect(plantilla?.cuerpo.length).toBeGreaterThan(0)
    expect((await api.post('/reep/mensajes', { destino, plantillaId: plantilla!.id, texto: { asunto: '', cuerpo: 'x' } })).status).toBe(422)
  })
})

describe('tablero: artículos sin pares', () => {
  it('cuenta los aprobados por el comité que aún no tienen pares, y el listado los filtra', async () => {
    const api = await como()
    const antes = (await api.get('/reep/tablero')).body.sinPares as number
    const art = await articuloAprobado()
    expect((await api.get('/reep/tablero')).body.sinPares).toBe(antes + 1)
    const lista = (await api.get('/reep/articulos?sinPares=1&porPagina=100')).body.items as Array<{ id: string; estado: string }>
    expect(lista.some((a) => a.id === art.id)).toBe(true)
    expect(lista.every((a) => a.estado === 'en-revision')).toBe(true)
    await candidato(art.id, 1)
    expect((await api.get('/reep/tablero')).body.sinPares).toBe(antes)
    const despues = (await api.get('/reep/articulos?sinPares=1&porPagina=100')).body.items as Array<{ id: string }>
    expect(despues.some((a) => a.id === art.id)).toBe(false)
  })
})

describe('informe: listado de artículos y resultados por revista', () => {
  it('trae número de OJS, título, autores y volumen y número de los aprobados, y suma publicados, no publicados y rechazados', async () => {
    const api = await como()
    const art = await articuloAprobado()
    await api.post(`/reep/articulos/${art.id}/cerrar`, { estado: 'aprobado', motivo: 'Aprobado', publicacion: { volumen: 9, numero: 2 } })
    const inf = (await api.get('/informes?revista=ambas&periodo=2026-2')).body
    const fila = inf.articulos.find((a: { titulo: string }) => a.titulo.startsWith('Artículo de prueba'))
    expect(fila).toBeTruthy()
    const aprobado = inf.articulos.find((a: { publicacion: unknown }) => a.publicacion !== null)
    expect(aprobado).toMatchObject({ revista: 'reep', publicacion: { volumen: 9, numero: 2 } })
    expect(aprobado.autores).toMatch(/Autora/)
    const reep = inf.resultados.find((r: { revista: string }) => r.revista === 'reep')
    expect(reep.publicados + reep.noPublicados + reep.rechazados).toBe(inf.postulados.reep)
    expect(reep.publicados).toBe(inf.aprobados.reep)
    expect(inf.resultados.map((r: { revista: string }) => r.revista)).toEqual(['reep', 'ire'])
    const soloIre = (await api.get('/informes?revista=ire&periodo=2026-2')).body
    expect(soloIre.articulos.every((a: { revista: string }) => a.revista === 'ire')).toBe(true)
  })
})
