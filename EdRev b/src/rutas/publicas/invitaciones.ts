/*
 * Respuesta del par desde el correo — public routes (the peer has no account). The routes only say
 * where each request goes; the rules are in servicios/invitacionesPar. RF-22, RF-15, RF-24.
 */
import { Router } from 'express'
import * as invitaciones from '../../controladores/invitaciones.js'

export const rutasInvitaciones = Router()

rutasInvitaciones.get('/invitaciones/:token', invitaciones.ver)
rutasInvitaciones.post('/invitaciones/:token', invitaciones.responder)
