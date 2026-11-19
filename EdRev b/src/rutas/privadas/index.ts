/*
 * Rutas privadas — everything the application does behind the session. The whole router is mounted
 * after the authentication middleware (see app.ts), so no route here can be reached without a valid
 * token; Administración adds its own guard (only the Administradora).
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
