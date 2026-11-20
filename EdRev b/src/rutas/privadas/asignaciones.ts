/*
 * Asignación y evaluación — las rutas solo dicen a dónde va cada petición: asignar un par a un artículo
 * aprobado, la respuesta del par, la entrega, el concepto y el reenvío tras un envío rebotado o fallido.
 * La validación está en controladores/asignaciones y las reglas en servicios/asignaciones.
 */
import { Router } from 'express'
import * as asignaciones from '../../controladores/asignaciones.js'

export const rutasAsignaciones = Router()

rutasAsignaciones.post('/:revista/articulos/:id/asignaciones', asignaciones.asignar)
rutasAsignaciones.post('/:revista/asignaciones/:id/respuesta', asignaciones.responder)
rutasAsignaciones.post('/:revista/asignaciones/:id/entrega', asignaciones.marcarEntrega)
rutasAsignaciones.post('/:revista/asignaciones/:id/concepto', asignaciones.registrarConcepto)
rutasAsignaciones.post('/:revista/asignaciones/:id/reenviar', asignaciones.reenviar)
