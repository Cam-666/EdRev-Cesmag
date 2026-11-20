/*
 * Registros migrados por corregir — las rutas solo dicen a dónde va cada petición. Ambos perfiles pueden
 * corregir. La validación está en controladores/migracion y las reglas en servicios/correccionMigracion.
 */
import { Router } from 'express'
import * as migracion from '../../controladores/migracion.js'

export const rutasMigracion = Router()

rutasMigracion.get('/:revista/por-corregir', migracion.listar)
rutasMigracion.post('/:revista/por-corregir/:id', migracion.corregir)
