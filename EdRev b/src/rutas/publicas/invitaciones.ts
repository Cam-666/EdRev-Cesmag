/*
 * Respuesta del par desde el correo — rutas públicas (el par no tiene cuenta). Las rutas solo dicen a dónde va
 * cada petición; las reglas están en servicios/invitacionesPar.
 */
import { Router } from 'express'
import * as invitaciones from '../../controladores/invitaciones.js'

export const rutasInvitaciones = Router()

rutasInvitaciones.get('/invitaciones/:token', invitaciones.ver)
rutasInvitaciones.post('/invitaciones/:token', invitaciones.responder)
