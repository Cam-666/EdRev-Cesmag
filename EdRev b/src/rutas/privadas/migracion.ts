/*
 * Registros migrados por corregir (RF-44, HU-32) — the routes only say where each request goes.
 * Both profiles can correct (RNF-05). Validation is in controladores/migracion, the rules in
 * servicios/correccionMigracion.
 */
import { Router } from 'express'
import * as migracion from '../../controladores/migracion.js'

export const rutasMigracion = Router()

rutasMigracion.get('/:revista/por-corregir', migracion.listar)
rutasMigracion.post('/:revista/por-corregir/:id', migracion.corregir)
