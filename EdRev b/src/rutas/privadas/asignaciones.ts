/*
 * Asignación y evaluación — the routes only say where each request goes: assign a peer to an
 * approved article (RF-19), the peer's answer (RF-22), delivery (RF-23), concept (RF-20) and the
 * resend after a bounced or failed send (RF-28). Validation is in controladores/asignaciones, the
 * rules in servicios/asignaciones.
 */
import { Router } from 'express'
import * as asignaciones from '../../controladores/asignaciones.js'

export const rutasAsignaciones = Router()

rutasAsignaciones.post('/:revista/articulos/:id/asignaciones', asignaciones.asignar)
rutasAsignaciones.post('/:revista/asignaciones/:id/respuesta', asignaciones.responder)
rutasAsignaciones.post('/:revista/asignaciones/:id/entrega', asignaciones.marcarEntrega)
rutasAsignaciones.post('/:revista/asignaciones/:id/concepto', asignaciones.registrarConcepto)
rutasAsignaciones.post('/:revista/asignaciones/:id/reenviar', asignaciones.reenviar)
