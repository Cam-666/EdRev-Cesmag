/*
 * correos (controlador) — recibe y valida las peticiones sobre el registro de correos y responde. Las reglas
 * están en servicios/registroCorreos.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { CORREO_VALIDO, enteroDe, idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as correos from '../servicios/registroCorreos.js'

const correccion = z.object({
  correo: z.string().trim().toLowerCase().regex(CORREO_VALIDO, 'Escriba un correo válido'),
})

const revistaDe = (req: Request) => idRevista(req.params.revista)
// Los mensajes enviados a mano llevan una «m» antes del número (m12); los demás correos, solo el número.
const correoDe = (req: Request): string => {
  const id = String(req.params.id)
  if (/^m\d+$/.test(id)) return id
  return String(idNumerico(id, 'Correo'))
}

export async function listar(req: Request, res: Response): Promise<void> {
  const q = req.query
  res.json(
    await correos.listarCorreos(revistaDe(req), {
      tipo: q.tipo ? String(q.tipo) : null,
      estado: q.estado ? String(q.estado) : null,
      para: q.para ? String(q.para) : null,
      pagina: enteroDe(q.pagina, 1, 1),
      porPagina: enteroDe(q.porPagina, 10, 1, 100),
    }),
  )
}

export async function reintentarFallidos(req: Request, res: Response): Promise<void> {
  res.json(await correos.reintentarPendientes(revistaDe(req)))
}

export async function reintentar(req: Request, res: Response): Promise<void> {
  res.json(await correos.reintentarCorreo(revistaDe(req), correoDe(req)))
}

export async function corregir(req: Request, res: Response): Promise<void> {
  const { correo } = correccion.parse(req.body)
  res.json(await correos.corregirYReenviar(revistaDe(req), correoDe(req), correo, usuarioDe(req).id))
}
