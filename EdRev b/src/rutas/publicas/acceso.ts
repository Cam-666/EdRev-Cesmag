/*
 * Acceso — public: login (RF-39), password recovery (RF-46) and the links to define a password
 * (RF-40, RF-46). The routes only say where each request goes; the rules are in servicios/acceso.
 */
import { Router } from 'express'
import * as acceso from '../../controladores/acceso.js'

export const rutasAcceso = Router()

rutasAcceso.post('/auth/login', acceso.iniciarSesion)
rutasAcceso.post('/auth/recuperar', acceso.recuperar)
rutasAcceso.get('/auth/enlaces/:token', acceso.leerEnlace)
rutasAcceso.post('/auth/enlaces/:token', acceso.definirContrasena)
