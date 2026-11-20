/*
 * Rutas privadas — todo lo que hace la aplicación detrás de la sesión. Todo el router se monta después del
 * middleware de autenticación (ver app.ts), así que ninguna ruta de aquí se alcanza sin un token válido;
 * Administración agrega su propio guardia (solo la Administradora).
 */
import { Router } from 'express'
import { rutasAdmin } from './admin.js'
import { rutasArticulos } from './articulos.js'
import { rutasAsignaciones } from './asignaciones.js'
import { rutasAutores } from './autores.js'
import { rutasConstancias } from './constancias.js'
import { rutasCorreos } from './correos.js'
import { rutasInformes } from './informes.js'
import { rutasMigracion } from './migracion.js'
import { rutasPanel } from './panel.js'
import { rutasPares } from './pares.js'

export const rutasPrivadas = Router()

rutasPrivadas.use(rutasAdmin)
rutasPrivadas.use(rutasInformes)
rutasPrivadas.use(rutasPanel)
rutasPrivadas.use(rutasArticulos)
rutasPrivadas.use(rutasAutores)
rutasPrivadas.use(rutasPares)
rutasPrivadas.use(rutasAsignaciones)
rutasPrivadas.use(rutasConstancias)
rutasPrivadas.use(rutasCorreos)
rutasPrivadas.use(rutasMigracion)
