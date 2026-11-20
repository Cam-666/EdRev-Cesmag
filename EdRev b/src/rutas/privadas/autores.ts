/*
 * Autores — las rutas solo dicen a dónde va cada petición: el directorio común de las dos revistas, la ficha
 * del autor con todos sus artículos, el registro y la edición. La validación está en controladores/autores y
 * las reglas en servicios/autores.
 */
import { Router } from 'express'
import * as autores from '../../controladores/autores.js'

export const rutasAutores = Router()

// La ruta fija va antes de «:id»; si no, se leería como un id.
rutasAutores.get('/:revista/autores/filtros', autores.filtros)
rutasAutores.get('/:revista/autores', autores.buscar)
rutasAutores.post('/:revista/autores', autores.registrar)

rutasAutores.get('/:revista/autores/:id', autores.ficha)
rutasAutores.get('/:revista/autores/:id/articulos', autores.articulos)
rutasAutores.patch('/:revista/autores/:id', autores.editar)
