/*
 * Correos enviados — las rutas solo dicen a dónde va cada petición: el registro de cada revista con sus
 * contadores, el reintento de los correos fallidos y «corregir y reenviar». La validación está en
 * controladores/correos y las reglas en servicios/registroCorreos.
 */
import { Router } from 'express'
import * as correos from '../../controladores/correos.js'

export const rutasCorreos = Router()

rutasCorreos.get('/:revista/correos', correos.listar)
rutasCorreos.post('/:revista/correos/reintentar-fallidos', correos.reintentarFallidos)
rutasCorreos.post('/:revista/correos/:id/reintentar', correos.reintentar)
rutasCorreos.post('/:revista/correos/:id/corregir', correos.corregir)
