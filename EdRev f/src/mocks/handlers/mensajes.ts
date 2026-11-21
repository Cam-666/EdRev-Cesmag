/*
 * Manejadores MSW de los mensajes que se envían a mano a un par o a un autor: las plantillas de mensaje de una
 * revista, la vista previa del correo y el envío. Un mensaje enviado queda en el registro de correos de la revista
 * (tipo «mensaje», sin artículo). Igual que el servidor real: solo se usan plantillas de mensaje de esa revista y
 * a quien no tiene un correo válido no se le puede escribir. Lo pueden hacer la Administradora y la Auxiliar.
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, plantillas } from '../db'
import { ahoraIso, contexto, error } from './util'
import type { SeedRevista } from '../seed/fabrica'
import type { Revista } from '@/types/revista'

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Pedido {
  destino?: { tipo?: string; id?: string }
  plantillaId?: string
}

interface Persona {
  nombre: string
  correo: string
  universidad: string
  profesion: string
}

function personaDe(base: SeedRevista, destino: Pedido['destino']): Persona | null {
  if (destino?.tipo === 'par') {
    const par = base.pares.find((p) => p.id === destino.id)
    return par ? { nombre: par.nombre, correo: par.correo, universidad: par.universidad, profesion: par.profesion } : null
  }
  if (destino?.tipo === 'autor') {
    const autor = autorPorId(String(destino.id))
    return autor ? { nombre: autor.nombre, correo: autor.correo, universidad: autor.filiacion, profesion: '' } : null
  }
  return null
}

function plantillaDe(revista: Revista, id: string | undefined) {
  return plantillas().find((p) => p.id === id && p.revista === revista && p.fin === 'mensaje')
}

const rellenar = (texto: string, v: Record<string, string>) => texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '')

const NOMBRE_REVISTA: Record<Revista, string> = {
  reep: 'Revista Electrónica en Educación y Pedagogía',
  ire: 'Revista Investigium IRE Ciencias Sociales y Humanas',
}

function datosDe(revista: Revista, p: Persona): Record<string, string> {
  return {
    revista: NOMBRE_REVISTA[revista],
    nombre: p.nombre,
    universidad: p.universidad,
    profesion: p.profesion,
    fecha: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    anio: String(new Date().getFullYear()),
  }
}

/** Las plantillas de invitación o de agradecimiento con texto, la predeterminada primero (como el servidor real). */
function deEnvio(revista: Revista, fin: string | null) {
  return plantillas()
    .filter((p) => p.revista === revista && p.fin === fin && p.cuerpo.trim())
    .sort((a, b) => Number(b.enUso) - Number(a.enUso) || a.nombre.localeCompare(b.nombre))
}

export const handlersMensajes = [
  http.get('*/api/:revista/correos/plantillas', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const fin = new URL(request.url).searchParams.get('fin')
    if (fin !== 'invitacion' && fin !== 'agradecimiento') return error(422, 'Indique si es una invitación o un agradecimiento')
    return HttpResponse.json(
      deEnvio(c.revista, fin).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        predeterminada: p.enUso,
        asunto: p.asunto ?? '',
        cuerpo: p.cuerpo,
        variables: p.variables,
      })),
    )
  }),

  http.post('*/api/:revista/correos/vista-previa', async ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const { fin, cuerpo } = (await request.json()) as { fin: string; cuerpo: string }
    const titulo = fin === 'agradecimiento' ? 'Gracias por su evaluación' : 'Invitación a evaluar un artículo'
    return HttpResponse.json({
      html: `<!doctype html><html lang="es"><body><h1>Universidad CESMAG</h1><h2>${titulo}</h2><p>${cuerpo}</p><small>Aviso de datos personales</small></body></html>`,
    })
  }),

  http.get('*/api/:revista/mensajes/plantillas', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json(
      plantillas()
        .filter((p) => p.revista === c.revista && p.fin === 'mensaje' && p.cuerpo.trim())
        .map((p) => ({ id: p.id, nombre: p.nombre })),
    )
  }),

  http.post('*/api/:revista/mensajes/vista-previa', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const pedido = (await request.json()) as Pedido
    const persona = personaDe(c.base, pedido.destino)
    if (!persona) return error(404, 'La persona no existe')
    const plantilla = plantillaDe(c.revista, pedido.plantillaId)
    if (!plantilla) return error(404, 'La plantilla no existe en esa revista o no es una plantilla de mensaje')
    const v = datosDe(c.revista, persona)
    const cuerpo = rellenar(plantilla.cuerpo, v)
    return HttpResponse.json({
      para: { nombre: persona.nombre, correo: persona.correo.trim() || null },
      de: 'editorial@unicesmag.edu.co',
      asunto: rellenar(plantilla.asunto ?? '', v),
      html: `<!doctype html><html lang="es"><body><h1>Universidad CESMAG</h1><h2>Mensaje de la Dependencia de Editorial</h2><p>${cuerpo.replace(/\n/g, '<br>')}</p><small>Aviso de datos personales</small></body></html>`,
    })
  }),

  http.post('*/api/:revista/mensajes', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const pedido = (await request.json()) as Pedido
    const persona = personaDe(c.base, pedido.destino)
    if (!persona) return error(404, 'La persona no existe')
    const plantilla = plantillaDe(c.revista, pedido.plantillaId)
    if (!plantilla) return error(404, 'La plantilla no existe en esa revista o no es una plantilla de mensaje')
    const correo = persona.correo.trim().toLowerCase()
    if (!CORREO_VALIDO.test(correo)) {
      return error(409, `${persona.nombre} no tiene un correo válido registrado: corríjalo en su ficha antes de enviarle un mensaje`)
    }
    const v = datosDe(c.revista, persona)
    const id = `${c.revista}-msg-n${c.base.correos.length + 1}`
    c.base.correos.unshift({
      id,
      revista: c.revista,
      articuloId: '',
      asignacionId: '',
      tipo: 'mensaje',
      destinatario: correo,
      nombreDestinatario: persona.nombre,
      asunto: rellenar(plantilla.asunto ?? '', v),
      fechaEnvio: ahoraIso(),
      estado: 'enviado',
      atendido: false,
      respuestaPar: null,
    })
    return HttpResponse.json({ id, estado: 'en-cola', destinatario: correo, nombre: persona.nombre }, { status: 201 })
  }),
]
