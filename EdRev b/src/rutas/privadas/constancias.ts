/*
 * Constancias — the routes only say where each request goes: pending and issued (RF-34), preview
 * (RF-30), download (RF-32), issuing one or all the pending ones (RF-31) and reissuing (RF-33).
 * Validation is in controladores/constancias, the rules in servicios/gestionConstancias.
 */
import { Router } from 'express'
import * as constancias from '../../controladores/constancias.js'

export const rutasConstancias = Router()

rutasConstancias.get('/:revista/constancias', constancias.listar)
rutasConstancias.post('/:revista/constancias/emitir-pendientes', constancias.emitirPendientes)
rutasConstancias.get('/:revista/constancias/:id/vista-previa', constancias.vistaPrevia)
rutasConstancias.get('/:revista/constancias/:id/pdf', constancias.pdf)
rutasConstancias.post('/:revista/constancias/:id/emitir', constancias.emitir)
rutasConstancias.post('/:revista/constancias/:id/reenviar', constancias.reenviar)
