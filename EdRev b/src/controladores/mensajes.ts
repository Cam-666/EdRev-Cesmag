/*
 * mensajes (controlador) — recibe y valida las peticiones para enviarle a mano un correo a un par o a un autor:
 * las plantillas de mensaje de la revista, la vista previa y el envío. Las reglas están en servicios/mensajes.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as plantillas from '../servicios/administracion/plantillas.js'
import * as mensajes from '../servicios/mensajes.js'

// Se envía una plantilla de mensaje (plantillaId) o un texto escrito al momento (texto), que no se guarda como plantilla.
const pedido = z
  .object({
    destino: z.object({ tipo: z.enum(['par', 'autor']), id: z.string().min(1) }),
    plantillaId: z.string().min(1).optional(),
    texto: z.object({ asunto: z.string().max(300), cuerpo: z.string().max(20000) }).optional(),
  })
  .refine((p) => (p.plantillaId === undefined) !== (p.texto === undefined), {
    message: 'Elija una plantilla o escriba el mensaje',
  })

const revistaDe = (req: Request) => idRevista(req.params.revista)

function leer(req: Request) {
  const p = pedido.parse(req.body)
  return {
    destino: { tipo: p.destino.tipo, id: idNumerico(p.destino.id, p.destino.tipo === 'par' ? 'Par' : 'Autor') },
    contenido: p.texto
      ? { asunto: p.texto.asunto, cuerpo: p.texto.cuerpo }
      : { plantilla: idNumerico(p.plantillaId ?? '', 'Plantilla') },
  }
}

const finEnvio = z.enum(['invitacion', 'agradecimiento'])

/** Las plantillas de invitación o de agradecimiento de la revista, para elegir al asignar un par o emitir una constancia. */
export async function plantillasDeEnvio(req: Request, res: Response): Promise<void> {
  const fin = finEnvio.parse(req.query.fin)
  res.json(await plantillas.plantillasParaEnviar(revistaDe(req), fin))
}

/** El correo de invitación o de agradecimiento tal como se verá, con el texto que se está escribiendo. */
export async function vistaPreviaEnvio(req: Request, res: Response): Promise<void> {
  const { fin, cuerpo } = z.object({ fin: finEnvio, cuerpo: z.string() }).parse(req.body)
  res.json(await plantillas.vistaCorreo({ revista: revistaDe(req) === 1 ? 'reep' : 'ire', uso: fin, cuerpo }))
}

export async function plantillasDeMensaje(req: Request, res: Response): Promise<void> {
  res.json(await mensajes.plantillasDeMensaje(revistaDe(req)))
}

export async function vistaPrevia(req: Request, res: Response): Promise<void> {
  const p = leer(req)
  res.json(await mensajes.vistaPrevia(revistaDe(req), p.destino, p.contenido))
}

export async function enviar(req: Request, res: Response): Promise<void> {
  const p = leer(req)
  res.status(201).json(await mensajes.enviarMensaje(revistaDe(req), p.destino, p.contenido, usuarioDe(req).id))
}
