/*
 * MSW handlers for the migrated records to correct (RF-44, HU-32): the list of each journal and
 * the correction, which writes the chosen value in the record, removes it from the list and leaves
 * a trace in the history. Both profiles (RNF-05).
 */
import { http, HttpResponse } from 'msw'
import { ahoraIso, contexto, error } from './util'
import type { EstadoArticulo, TipoArticulo } from '@/types/articulo'
import type { ConceptoPar } from '@/types/par'

const TIPOS: readonly TipoArticulo[] = ['investigacion', 'reflexion', 'revision']
const ESTADOS: readonly EstadoArticulo[] = [
  'postulado',
  'en-revision',
  'en-evaluacion',
  'aprobado',
  'rechazado',
  'archivado',
]
const CONCEPTOS: readonly ConceptoPar[] = [
  'publicable',
  'publicable-con-modificaciones',
  'no-publicable',
  'pendiente-formato',
]

export const handlersMigracion = [
  http.get('*/api/:revista/por-corregir', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json(c.base.porCorregir)
  }),

  http.post('*/api/:revista/por-corregir/:id', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const registro = c.base.porCorregir.find((x) => x.id === params.id)
    if (!registro) return error(404, 'El registro ya fue corregido')
    const { valor } = (await request.json()) as { valor: string }
    const ref = registro.enlace.split('/')
    let articuloId: string | null = null

    if (registro.campo === 'tipo-articulo' || registro.campo === 'estado-articulo') {
      const articulo = c.base.articulos.find((a) => a.id === decodeURIComponent(ref[3] ?? ''))
      if (!articulo) return error(404, 'Artículo no encontrado')
      if (registro.campo === 'tipo-articulo') {
        if (!TIPOS.includes(valor as TipoArticulo)) return error(422, 'Elija un tipo de la lista')
        articulo.tipo = valor as TipoArticulo
      } else {
        if (!ESTADOS.includes(valor as EstadoArticulo))
          return error(422, 'Elija un estado de la lista')
        articulo.estado = valor as EstadoArticulo
      }
      articuloId = articulo.id
    } else if (registro.campo === 'concepto') {
      const numero = decodeURIComponent(ref[3] ?? '')
      const orden = /par (\d+)$/.exec(registro.descripcion)?.[1]
      const asignacion = c.base.asignaciones.find((a) => a.id === `${numero}-p${orden}`)
      if (!asignacion) return error(404, 'Evaluación no encontrada')
      if (!CONCEPTOS.includes(valor as ConceptoPar))
        return error(422, 'Elija un concepto de la lista')
      asignacion.concepto = valor as ConceptoPar
      articuloId = numero
    } else {
      const par = c.base.pares.find((p) => p.id === decodeURIComponent(ref[3] ?? ''))
      if (!par) return error(404, 'Par evaluador no encontrado')
      const correo = valor.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return error(422, 'Escriba un correo válido')
      if (c.base.pares.some((p) => p.id !== par.id && p.correo.toLowerCase() === correo)) {
        return error(409, 'Ya existe un par con ese correo en esta revista')
      }
      par.correo = correo
    }

    c.base.porCorregir = c.base.porCorregir.filter((x) => x.id !== registro.id)
    c.base.auditoria.unshift({
      id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
      revista: c.revista,
      articuloId,
      tipo: 'edicion',
      accion: `Corrigió un dato migrado del Excel («${registro.valorExcel || 'vacío'}»)`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
