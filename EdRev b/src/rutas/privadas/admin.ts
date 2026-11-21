/*
 * Administración — solo de la Administradora. Las rutas solo dicen a dónde va cada petición: cuentas de
 * usuario, plantillas de cada revista, registro de auditoría de las dos revistas y configuración.
 * La validación está en controladores/admin y las reglas en servicios/administracion.
 */
import { Router } from 'express'
import multer from 'multer'
import * as auditoria from '../../controladores/admin/auditoria.js'
import * as configuracion from '../../controladores/admin/configuracion.js'
import * as plantillas from '../../controladores/admin/plantillas.js'
import * as usuarios from '../../controladores/admin/usuarios.js'
import { soloAdministradora } from '../../middlewares/autenticacion.js'

export const rutasAdmin = Router()
rutasAdmin.use(['/usuarios', '/plantillas', '/auditoria', '/configuracion'], soloAdministradora)

const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

// Usuarios
rutasAdmin.get('/usuarios', usuarios.listar)
rutasAdmin.post('/usuarios', usuarios.crear)
rutasAdmin.patch('/usuarios/:id', usuarios.editar)
rutasAdmin.delete('/usuarios/:id', usuarios.eliminar)
rutasAdmin.post('/usuarios/:id/enlace', usuarios.reenviarEnlace)

// Plantillas
rutasAdmin.get('/plantillas', plantillas.listar)
rutasAdmin.post('/plantillas', plantillas.crear)
rutasAdmin.post('/plantillas/vista-correo', plantillas.vistaCorreo)
rutasAdmin.put('/plantillas/:id', plantillas.guardar)
rutasAdmin.post('/plantillas/:id/predeterminada', plantillas.predeterminada)
rutasAdmin.delete('/plantillas/:id', plantillas.eliminar)
rutasAdmin.post('/plantillas/:id/imagen/:parte', subida.single('archivo'), plantillas.subirImagen)
rutasAdmin.delete('/plantillas/:id/imagen/:parte', plantillas.quitarImagen)
rutasAdmin.get('/plantillas/:id/vista-previa', plantillas.vistaPdfGuardada)
rutasAdmin.post('/plantillas/:id/vista-previa', plantillas.vistaPdfBorrador)

// Auditoría
rutasAdmin.get('/auditoria', auditoria.listar)

// Configuración
rutasAdmin.get('/configuracion', configuracion.obtener)
rutasAdmin.put('/configuracion', configuracion.cambiarDias)
rutasAdmin.put('/configuracion/revistas/:sigla', configuracion.cambiarRevista)
