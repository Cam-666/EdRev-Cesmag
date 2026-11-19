/*
 * auditoria (controlador) — reads the filters of the audit log (RF-41) and answers.
 */
import type { Request, Response } from 'express'
import { enteroDe } from '../../lib/http.js'
import { listarAuditoria } from '../../servicios/administracion/auditoria.js'

export async function listar(req: Request, res: Response): Promise<void> {
  res.json(
    await listarAuditoria({
      revista: req.query.revista === 'reep' ? 1 : req.query.revista === 'ire' ? 2 : null,
      usuario: String(req.query.usuario ?? '').trim(),
      tipo: req.query.tipo ? String(req.query.tipo) : null,
      pagina: enteroDe(req.query.pagina, 1, 1),
      porPagina: enteroDe(req.query.porPagina, 10, 1, 1000),
    }),
  )
}
