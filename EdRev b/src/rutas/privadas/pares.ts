/*
 * Pares evaluadores — the routes only say where each request goes. One base common to both
 * journals (RF-12): list (RF-14), areas and universities already written (RF-13), the record
 * (RF-18), registration, edition, block and unblock (RF-15, RF-16). Validation is in
 * controladores/pares, the rules in servicios/pares.
 */
import { Router } from 'express'
import * as pares from '../../controladores/pares.js'

export const rutasPares = Router()

// The fixed paths go before «:id», or they would be read as an id.
rutasPares.get('/:revista/pares', pares.listar)
rutasPares.get('/:revista/pares/areas', pares.areas)
rutasPares.get('/:revista/pares/universidades', pares.universidades)
rutasPares.post('/:revista/pares', pares.registrar)

rutasPares.get('/:revista/pares/:id', pares.ficha)
rutasPares.patch('/:revista/pares/:id', pares.editar)
rutasPares.post('/:revista/pares/:id/bloquear', pares.bloquear)
rutasPares.post('/:revista/pares/:id/desbloquear', pares.desbloquear)
