/*
 * Mensajes — enviarle a mano un correo a un par o a un autor con una plantilla de mensaje. Las rutas solo dicen a
 * dónde va cada petición; la validación está en controladores/mensajes y las reglas en servicios/mensajes.
 */
import { Router } from 'express'
import * as mensajes from '../../controladores/mensajes.js'

export const rutasMensajes = Router()

rutasMensajes.get('/:revista/mensajes/plantillas', mensajes.plantillasDeMensaje)
rutasMensajes.get('/:revista/correos/plantillas', mensajes.plantillasDeEnvio)
rutasMensajes.post('/:revista/correos/vista-previa', mensajes.vistaPreviaEnvio)
rutasMensajes.post('/:revista/mensajes/vista-previa', mensajes.vistaPrevia)
rutasMensajes.post('/:revista/mensajes', mensajes.enviar)
