/*
 * migracion (controlador) — recibe y valida las correcciones de los registros migrados y responde. Las reglas
 * están en servicios/correccionMigracion.
 */
import type { Request, Response } from 'express'
import { z } from 'zod'
import { idNumerico, idRevista } from '../lib/http.js'
import { usuarioDe } from '../middlewares/autenticacion.js'
import * as migracion from '../servicios/correccionMigracion.js'

export async function listar(req: Request, res: Response): Promise<void> {
  res.json(await migracion.listarPorCorregir(idRevista(req.params.revista)))
}

export async function corregir(req: Request, res: Response): Promise<void> {
  const { valor } = z.object({ valor: z.string() }).parse(req.body)
  await migracion.corregirRegistro(
    idRevista(req.params.revista),
    idNumerico(req.params.id, 'Registro'),
    valor,
    usuarioDe(req).id,
  )
  res.status(204).end()
}
