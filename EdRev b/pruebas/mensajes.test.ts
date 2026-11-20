/*
 * Pruebas de los mensajes que se envían a mano a un par o a un autor con una plantilla de mensaje
 */
import { describe, expect, it } from 'vitest'
import { pool } from '../src/db.js'
import { asegurarEsquema } from '../src/esquema.js'
import { AUXILIAR, como } from './api.js'

const unico = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

async function nuevoPar(correo = `par${unico()}@universidad.edu.co`) {
  const api = await como()
  const nombre = `Par de Mensajes ${unico()}`
  const r = await api.post('/reep/pares', { nombre, profesion: 'Magíster en Educación', correo, universidad: 'Universidad del Cauca', area: 'Pedagogía' })
  expect(r.status).toBe(201)
  return { id: r.body.id as string, correo, nombre }
}

async function nuevoAutor(correo: string) {
  const api = await como()
  const r = await api.post('/reep/autores', { nombre: `Autor de Mensajes ${unico()}`, correo, orcid: '', filiacion: 'Universidad de Nariño', pais: 'Colombia' })
  expect(r.status).toBe(201)
  return r.body.id as string
}

async function plantillaGeneral(revista: 'reep' | 'ire' = 'reep') {
  const api = await como()
  const lista = (await api.get(`/${revista}/mensajes/plantillas`)).body as Array<{ id: string; nombre: string }>
  const p = lista.find((x) => x.nombre === 'Mensaje general')
  expect(p).toBeTruthy()
  return p!.id
}

describe('plantillas de mensaje', () => {
  it('cada revista trae «Mensaje general» y una plantilla nueva de mensaje no se marca como en uso', async () => {
    const api = await como()
    expect((await api.get('/reep/mensajes/plantillas')).body.map((p: { nombre: string }) => p.nombre)).toContain('Mensaje general')
    const nueva = await api.post('/plantillas', { revista: 'reep', nombre: `Aviso ${unico()}`, uso: 'mensaje' })
    expect(nueva.status).toBe(201)
    expect(nueva.body).toMatchObject({ fin: 'mensaje', clase: 'correo', enUso: false })
    expect(nueva.body.variables).toEqual(expect.arrayContaining(['nombre', 'revista', 'universidad']))
    // en blanco: todavía no se ofrece al enviar un correo
    const antes = (await api.get('/reep/mensajes/plantillas')).body.map((p: { id: string }) => p.id)
    expect(antes).not.toContain(nueva.body.id)
    // «en uso» solo existe para los envíos automáticos
    expect((await api.post(`/plantillas/${nueva.body.id}/asignar`, { uso: 'mensaje' })).status).toBe(409)
    expect((await api.post(`/plantillas/${nueva.body.id}/asignar`, { uso: 'invitacion' })).status).toBe(409)
    // solo acepta sus propios datos
    expect((await api.put(`/plantillas/${nueva.body.id}`, { asunto: 'Hola', cuerpo: 'Estimado {{par}}' })).status).toBe(422)
    expect((await api.put(`/plantillas/${nueva.body.id}`, { asunto: 'Hola {{nombre}}', cuerpo: 'Estimado(a) {{nombre}} de {{universidad}}' })).status).toBe(200)
    expect((await api.get('/reep/mensajes/plantillas')).body.map((p: { id: string }) => p.id)).toContain(nueva.body.id)
    // y se puede eliminar sin pasar por Configuración
    expect((await api.delete(`/plantillas/${nueva.body.id}`)).status).toBe(204)
  })

  it('la actualización automática del esquema se puede repetir sin cambiar nada', async () => {
    const antes = (await pool.query("SELECT count(*)::int AS n FROM plantilla WHERE fin = 'mensaje'")).rows[0].n
    await asegurarEsquema(pool)
    await asegurarEsquema(pool)
    expect((await pool.query("SELECT count(*)::int AS n FROM plantilla WHERE fin = 'mensaje'")).rows[0].n).toBe(antes)
  })
})

describe('enviar un mensaje a un par o a un autor', () => {
  it('la vista previa muestra el correo con los datos de la persona y el envío queda en el registro', async () => {
    const api = await como()
    const par = await nuevoPar()
    const plantilla = await plantillaGeneral()
    const previa = await api.post('/reep/mensajes/vista-previa', { destino: { tipo: 'par', id: par.id }, plantillaId: plantilla })
    expect(previa.status).toBe(200)
    expect(previa.body.para).toEqual({ nombre: par.nombre, correo: par.correo })
    expect(previa.body.asunto).toContain('Revista Electrónica en Educación y Pedagogía')
    expect(previa.body.html).toContain(par.nombre)
    expect(previa.body.html).toContain('UNIVERSIDAD')

    const enviado = await api.post('/reep/mensajes', { destino: { tipo: 'par', id: par.id }, plantillaId: plantilla })
    expect(enviado.status).toBe(201)
    expect(enviado.body).toMatchObject({ estado: 'en-cola', destinatario: par.correo })
    const registro = (await api.get('/reep/correos?tipo=mensaje&porPagina=100')).body
    const fila = registro.items.find((c: { id: string }) => c.id === enviado.body.id)
    expect(fila).toMatchObject({ tipo: 'mensaje', destinatario: par.correo, estado: 'en-cola', articuloId: '', asignacionId: '' })
    // el mensaje solo aparece en la revista desde la que salió
    const enIre = (await api.get('/ire/correos?tipo=mensaje&porPagina=100')).body.items
    expect(enIre.some((c: { id: string }) => c.id === enviado.body.id)).toBe(false)
    // se puede reintentar mientras sigue en cola
    expect((await api.post(`/reep/correos/${enviado.body.id}/reintentar`)).status).toBe(200)
    // y no se corrige como un correo de evaluación
    expect((await api.post(`/reep/correos/${enviado.body.id}/corregir`, { correo: 'otro@x.co' })).status).toBe(409)
  })

  it('a un autor sin correo no se le puede escribir, y la Auxiliar también puede enviar', async () => {
    const api = await como()
    const plantilla = await plantillaGeneral()
    const sinCorreo = await nuevoAutor('')
    const r = await api.post('/reep/mensajes', { destino: { tipo: 'autor', id: sinCorreo }, plantillaId: plantilla })
    expect(r.status).toBe(409)
    expect(r.body.mensaje).toContain('no tiene un correo válido')
    const conCorreo = await nuevoAutor(`autor${unico()}@ejemplo.edu.co`)
    const aux = await como(AUXILIAR)
    expect((await aux.post('/ire/mensajes', { destino: { tipo: 'autor', id: conCorreo }, plantillaId: await plantillaGeneral('ire') })).status).toBe(201)
  })

  it('una plantilla de otra revista, una que no es de mensaje o un destino inexistente se rechazan', async () => {
    const api = await como()
    const par = await nuevoPar()
    const deIre = await plantillaGeneral('ire')
    expect((await api.post('/reep/mensajes', { destino: { tipo: 'par', id: par.id }, plantillaId: deIre })).status).toBe(404)
    const invitacion = (await api.get('/plantillas')).body.plantillas.find((p: { revista: string; uso: string }) => p.revista === 'reep' && p.uso === 'invitacion')
    expect((await api.post('/reep/mensajes', { destino: { tipo: 'par', id: par.id }, plantillaId: invitacion.id })).status).toBe(404)
    expect((await api.post('/reep/mensajes', { destino: { tipo: 'par', id: '999999' }, plantillaId: await plantillaGeneral() })).status).toBe(404)
    expect((await api.post('/reep/mensajes', { destino: { tipo: 'par', id: par.id } })).status).toBe(422)
  })
})
