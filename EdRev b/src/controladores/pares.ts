/*
 * pares (controlador) — recibe y valida las peticiones sobre la base de pares y responde. Las reglas están en
 * servicios/pares.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { enTransaccion } from '../db.js'
import { enteroDe, idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as pares from '../servicios/pares.js'
import { datosPar } from './esquemas.js'

const revistaDe = (req: Request) => idRevista(req.params.revista)
const parDe = (req: Request) => idNumerico(req.params.id, 'Par evaluador')

export async function listar(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  const q = req.query
  res.json(
    await pares.listarPares({
      q: String(q.q ?? ''),
      area: String(q.area ?? ''),
      universidad: String(q.universidad ?? ''),
      estado: String(q.estado ?? 'disponibles'),
      articulo: q.articulo ? enteroDe(q.articulo, 0, 0) || null : null,
      pagina: enteroDe(q.pagina, 1, 1),
      porPagina: enteroDe(q.porPagina, 10, 1, 100),
    }),
  )
}

export async function areas(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  res.json(await pares.areasRegistradas())
}

export async function universidades(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  res.json(await pares.universidadesRegistradas())
}

export async function ficha(req: Request, res: Response): Promise<void> {
  revistaDe(req)
  res.json(await pares.fichaDePar(parDe(req)))
}

export async function registrar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const datos = datosPar.parse(req.body)
  const par = await enTransaccion((c) => pares.registrarPar(c, revista, usuarioDe(req).id, datos))
  res.status(201).json({
    ...pares.parApi(par),
    evaluacionesEntregadas: 0,
    invitacionesSinResponder: 0,
    ultimaParticipacion: null,
    participaciones: [],
  })
}

export async function editar(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = parDe(req)
  res.json(await pares.editarPar(id, revista, datosPar.partial().parse(req.body), usuarioDe(req).id))
}

export async function bloquear(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = parDe(req)
  const { motivo } = z.object({ motivo: z.enum(['no-desea', 'sin-respuesta']) }).parse(req.body)
  res.json(await pares.bloquearPar(id, revista, motivo, usuarioDe(req).id))
}

export async function desbloquear(req: Request, res: Response): Promise<void> {
  const revista = revistaDe(req)
  const id = parDe(req)
  const { motivo } = z.object({ motivo: z.string().trim().min(1, 'Escriba el motivo') }).parse(req.body)
  res.json(await pares.desbloquearPar(id, revista, motivo, usuarioDe(req).id))
}
