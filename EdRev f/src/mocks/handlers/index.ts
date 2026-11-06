import { handlersAcceso } from './acceso'
import { handlersArticulos } from './articulos'
import { handlersAutores } from './autores'

export const handlers = [...handlersAcceso, ...handlersArticulos, ...handlersAutores]
