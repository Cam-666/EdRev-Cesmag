/*
 * Panel — las rutas solo dicen a dónde va cada petición: el tablero de cada revista y el resumen de Inicio
 * con las dos. Las cifras están en servicios/panel.
 */
import { Router } from 'express'
import * as panel from '../../controladores/panel.js'

export const rutasPanel = Router()

rutasPanel.get('/:revista/tablero', panel.tablero)
rutasPanel.get('/resumen', panel.resumen)
