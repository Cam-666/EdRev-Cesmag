/*
 * Panel — the routes only say where each request goes: the dashboard of each journal and the home
 * summary of both (RF-37, HU-25). The figures are in servicios/panel.
 */
import { Router } from 'express'
import * as panel from '../../controladores/panel.js'

export const rutasPanel = Router()

rutasPanel.get('/:revista/tablero', panel.tablero)
rutasPanel.get('/resumen', panel.resumen)
