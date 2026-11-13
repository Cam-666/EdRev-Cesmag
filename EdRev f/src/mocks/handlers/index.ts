import { handlersAcceso } from './acceso'
import { handlersAdmin } from './admin'
import { handlersArticulos } from './articulos'
import { handlersAsignaciones } from './asignaciones'
import { handlersAutores } from './autores'
import { handlersConstancias } from './constancias'
import { handlersCorreos } from './correos'
import { handlersPanel } from './panel'
import { handlersMigracion } from './migracion'
import { handlersPares } from './pares'

export const handlers = [
  ...handlersAcceso,
  ...handlersAdmin,
  ...handlersArticulos,
  ...handlersAsignaciones,
  ...handlersAutores,
  ...handlersConstancias,
  ...handlersCorreos,
  ...handlersPanel,
  ...handlersPares,
  ...handlersMigracion,
]
