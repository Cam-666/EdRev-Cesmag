/*
 * Artículos — the routes only say where each request goes: list with filters (RF-35), sheet
 * (RF-36), registration with its authors (RF-01, RF-09, RF-10), OJS number warning (RF-03), edition
 * and publication (RF-04), committee rounds (RF-05, RF-06), change of journal (RF-07), closing
 * (RF-08) and the history (RF-26, RF-41). Validation is in controladores/articulos, the rules in
 * servicios/gestionArticulos, autoresArticulo and rondasComite.
 */
import { Router } from 'express'
import * as articulos from '../../controladores/articulos.js'

export const rutasArticulos = Router()

// The fixed paths go before «:id», or they would be read as an id.
rutasArticulos.get('/:revista/articulos/anios', articulos.anios)
rutasArticulos.get('/:revista/articulos/existe', articulos.existeOjs)
rutasArticulos.get('/:revista/publicaciones', articulos.publicaciones)
rutasArticulos.get('/:revista/articulos', articulos.listar)
rutasArticulos.post('/:revista/articulos', articulos.registrar)

rutasArticulos.get('/:revista/articulos/:id', articulos.ficha)
rutasArticulos.patch('/:revista/articulos/:id', articulos.editar)
rutasArticulos.post('/:revista/articulos/:id/autores', articulos.agregarAutorAlArticulo)
rutasArticulos.post('/:revista/articulos/:id/rondas', articulos.registrarRondaDelComite)
rutasArticulos.post('/:revista/articulos/:id/trasladar', articulos.trasladar)
rutasArticulos.post('/:revista/articulos/:id/cerrar', articulos.cerrar)
rutasArticulos.post('/:revista/articulos/:id/reabrir', articulos.reabrir)
rutasArticulos.get('/:revista/articulos/:id/historial', articulos.historial)
