/*
 * Artículos — las rutas solo dicen a dónde va cada petición: listado con filtros, ficha, registro con sus
 * autores, advertencia de número de OJS repetido, edición y publicación, rondas del comité, cambio de
 * revista, cierre e historial. La validación está en controladores/articulos y las reglas en
 * servicios/gestionArticulos, autoresArticulo y rondasComite.
 */
import { Router } from 'express'
import * as articulos from '../../controladores/articulos.js'

export const rutasArticulos = Router()

// Las rutas fijas van antes de «:id»; si no, se leerían como un id.
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
