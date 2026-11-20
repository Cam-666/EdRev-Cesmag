/*
 * asignaciones (controlador) — recibe y valida las peticiones para asignar pares y seguir su respuesta,
 * entrega y concepto, y responde. Las reglas están en servicios/asignaciones.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as asignaciones from '../servicios/asignaciones.js'
import { datosPar } from './esquemas.js'

const CONCEPTOS = ['publicable', 'publicable-con-modificaciones', 'no-publicable', 'pendiente-formato'] as const

const aAsignar = z.union([z.object({ parId: z.string() }), z.object({ nuevo: z.record(z.string(), z.unknown()) })])
const respuesta = z.object({ respuesta: z.enum(['acepto', 'no-acepto', 'no-desea', 'sin-respuesta']) })
const entrega = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  concepto: z.enum(CONCEPTOS).optional(),
})
const concepto = z.object({ concepto: z.enum(CONCEPTOS) })

const revistaDe = (req: Request) => idRevista(req.params.revista)
const asignacionDe = (req: Request) => idNumerico(req.params.id, 'Asignación')

export async function asignar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const idArticulo = idNumerico(req.params.id, 'Artículo')
  const datos = aAsignar.parse(req.body)
  const entrada = 'nuevo' in datos ? { nuevo: datosPar.parse(datos.nuevo) } : datos
  res.status(201).json(await asignaciones.asignarPar(revista, idArticulo, entrada, usuarioDe(req).id))
}

export async function responder(req: Request, res: Response): Promise<void> {
  const { respuesta: r } = respuesta.parse(req.body)
  res.json(await asignaciones.responderInvitacion(revistaDe(req), asignacionDe(req), r, usuarioDe(req).id))
}

export async function marcarEntrega(req: Request, res: Response): Promise<void> {
  const datos = entrega.parse(req.body)
  res.json(await asignaciones.marcarEntrega(revistaDe(req), asignacionDe(req), datos, usuarioDe(req).id))
}

export async function registrarConcepto(req: Request, res: Response): Promise<void> {
  const { concepto: c } = concepto.parse(req.body)
  res.json(await asignaciones.registrarConcepto(revistaDe(req), asignacionDe(req), c, usuarioDe(req).id))
}

export async function reenviar(req: Request, res: Response): Promise<void> {
  res.json(await asignaciones.reenviarInvitacion(revistaDe(req), asignacionDe(req)))
}
