/*
 * Acceso — público: ingreso, recuperación de contraseña y los enlaces para definir una contraseña.
 * Las rutas solo dicen a dónde va cada petición; las reglas están en servicios/acceso.
 */
import { Router } from 'express'
import * as acceso from '../../controladores/acceso.js'

export const rutasAcceso = Router()

rutasAcceso.post('/auth/login', acceso.iniciarSesion)
rutasAcceso.post('/auth/recuperar', acceso.recuperar)
rutasAcceso.get('/auth/enlaces/:token', acceso.leerEnlace)
rutasAcceso.post('/auth/enlaces/:token', acceso.definirContrasena)
