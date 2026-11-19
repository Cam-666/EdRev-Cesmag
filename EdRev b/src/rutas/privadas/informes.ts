/*
 * Informe de gestión — the routes only say where each request goes (RF-38, HU-27): the periods,
 * the figures of a semester for one journal or both, and the same report as a PDF document.
 * Both profiles. The figures are in servicios/informeGestion.
 */
import { Router } from 'express'
import * as informes from '../../controladores/informes.js'

export const rutasInformes = Router()

rutasInformes.get('/informes/periodos', informes.periodos)
rutasInformes.get('/informes', informes.informe)
rutasInformes.get('/informes/pdf', informes.pdf)
