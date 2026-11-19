/*
 * Autores — the routes only say where each request goes: the common directory of both journals
 * (RF-10), the author record with all its articles (RF-11), registration and edition. Validation
 * is in controladores/autores, the rules in servicios/autores.
 */
import { Router } from 'express'
import * as autores from '../../controladores/autores.js'

export const rutasAutores = Router()

// The fixed path goes before «:id», or it would be read as an id.
rutasAutores.get('/:revista/autores/filtros', autores.filtros)
rutasAutores.get('/:revista/autores', autores.buscar)
rutasAutores.post('/:revista/autores', autores.registrar)

rutasAutores.get('/:revista/autores/:id', autores.ficha)
rutasAutores.get('/:revista/autores/:id/articulos', autores.articulos)
rutasAutores.patch('/:revista/autores/:id', autores.editar)
