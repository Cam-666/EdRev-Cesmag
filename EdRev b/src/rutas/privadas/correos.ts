/*
 * Correos enviados — the routes only say where each request goes: the log of each journal with its
 * counters (RF-26), the retry of failed mails (RF-27) and «corregir y reenviar» (RF-28). Validation
 * is in controladores/correos, the rules in servicios/registroCorreos.
 */
import { Router } from 'express'
import * as correos from '../../controladores/correos.js'

export const rutasCorreos = Router()

rutasCorreos.get('/:revista/correos', correos.listar)
rutasCorreos.post('/:revista/correos/reintentar-fallidos', correos.reintentarFallidos)
rutasCorreos.post('/:revista/correos/:id/reintentar', correos.reintentar)
rutasCorreos.post('/:revista/correos/:id/corregir', correos.corregir)
