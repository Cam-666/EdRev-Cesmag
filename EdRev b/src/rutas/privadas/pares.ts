/*
 * Pares evaluadores — las rutas solo dicen a dónde va cada petición. Una sola base común a las dos revistas:
 * listado, áreas y universidades ya escritas, ficha, registro, edición, bloqueo y desbloqueo. La validación
 * está en controladores/pares y las reglas en servicios/pares.
 */
import { Router } from 'express'
import * as pares from '../../controladores/pares.js'

export const rutasPares = Router()

// Las rutas fijas van antes de «:id»; si no, se leerían como un id.
rutasPares.get('/:revista/pares', pares.listar)
rutasPares.get('/:revista/pares/areas', pares.areas)
rutasPares.get('/:revista/pares/universidades', pares.universidades)
rutasPares.post('/:revista/pares', pares.registrar)

rutasPares.get('/:revista/pares/:id', pares.ficha)
rutasPares.patch('/:revista/pares/:id', pares.editar)
rutasPares.post('/:revista/pares/:id/bloquear', pares.bloquear)
rutasPares.post('/:revista/pares/:id/desbloquear', pares.desbloquear)
