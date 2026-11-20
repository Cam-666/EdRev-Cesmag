/*
 * Informe de gestión — las rutas solo dicen a dónde va cada petición: los periodos, las cifras de un
 * semestre de una revista o de las dos, y el mismo informe como documento PDF. Para ambos perfiles.
 * Las cifras están en servicios/informeGestion.
 */
import { Router } from 'express'
import * as informes from '../../controladores/informes.js'

export const rutasInformes = Router()

rutasInformes.get('/informes/periodos', informes.periodos)
rutasInformes.get('/informes', informes.informe)
rutasInformes.get('/informes/pdf', informes.pdf)
