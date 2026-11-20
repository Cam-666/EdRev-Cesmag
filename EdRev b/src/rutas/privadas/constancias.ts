/*
 * Constancias — las rutas solo dicen a dónde va cada petición: pendientes y emitidas, vista previa, descarga,
 * emitir una o todas las pendientes y volver a emitir. La validación está en controladores/constancias y las
 * reglas en servicios/gestionConstancias.
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
