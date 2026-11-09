import { handlersAcceso } from './acceso'
import { handlersArticulos } from './articulos'
import { handlersAsignaciones } from './asignaciones'
import { handlersAutores } from './autores'
import { handlersPares } from './pares'

export const handlers = [
  ...handlersAcceso,
  ...handlersArticulos,
  ...handlersAsignaciones,
  ...handlersAutores,
  ...handlersPares,
]
