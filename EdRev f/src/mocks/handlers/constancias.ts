/*
 * MSW handlers for the constancias of a journal: pending and issued lists, preview rendered from
 * the template, issue (generates the document and sends it attached to the thank-you mail), issue
 * all pending, and reissue. Each journal uses its own thank-you and constancia templates in use
 * (with its PDF background). Simulates the PDF and the mail; no consecutive number is created.
 * Covers: RF-30..RF-34, RNF-19. Issuing is Administradora-only (RNF-05).
 */
import { http, HttpResponse } from 'msw'
import { configuracion, plantillaEnUso } from '../db'
import { FIRMA_CONSTANCIA, NOMBRE_EN_CORREO, UNIVERSIDAD_MEMBRETE } from '../plantillas'
import { textoPlano } from '@/lib/formato'
import { rellenar } from '@/lib/plantillas'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error } from './util'
import type { FilaConstancia, ResultadoEmision, VistaConstancia } from '@/types/constancia'
import type { EstadoCorreo } from '@/types/historial'
import type { Constancia } from '@/types/par'
import type { Revista } from '@/types/revista'

/** Addresses ending like this bounce (demo of the failed-send flow, RF-27). */
const DOMINIO_QUE_REBOTA = '@invalido.test'

/**
 * Every delivered evaluation has a constancia record: one that never got it (RF-34) is created
 * as pending, so the "pendientes" list never misses a case.
 */
export function asegurarConstancias(base: SeedRevista): void {
  for (const a of base.asignaciones) {
    if (a.estado === 'entrego' && !base.constancias.some((c) => c.asignacionId === a.id)) {
      base.constancias.push({
        id: `${a.id}-k`,
        asignacionId: a.id,
        estado: 'pendiente',
        fechaEmision: null,
        origen: 'sistema',
      })
    }
  }
}

export function filaDe(base: SeedRevista, c: Constancia): FilaConstancia | null {
  const asignacion = base.asignaciones.find((a) => a.id === c.asignacionId)
  const par = base.pares.find((p) => p.id === asignacion?.parId)
  const articulo = base.articulos.find((a) => a.id === asignacion?.articuloId)
  if (!asignacion || !par || !articulo) return null
  return {
    id: c.id,
    asignacionId: c.asignacionId,
    estado: c.estado,
    origen: c.origen,
    par: { id: par.id, nombre: par.nombre, correo: par.correo },
    articulo: { id: articulo.id, numeroOjs: articulo.numeroOjs, titulo: articulo.titulo },
    fechaEntrega: asignacion.fechaEntrega ?? '',
    fechaEmision: c.fechaEmision,
  }
}

export function filasDe(base: SeedRevista): FilaConstancia[] {
  asegurarConstancias(base)
  return base.constancias.flatMap((c) => {
    const fila = filaDe(base, c)
    return fila ? [fila] : []
  })
}

/** The journal's constancia template in use, written over its PDF background (RF-30). */
function vistaDe(revista: Revista, fila: FilaConstancia): VistaConstancia {
  const nombreRevista = NOMBRE_EN_CORREO[revista]
  const plantilla = plantillaEnUso(revista, 'constancia')
  const datos = configuracion().revistas[revista]
  return {
    universidad: UNIVERSIDAD_MEMBRETE,
    revista: nombreRevista,
    // The text without its formatting marks; the PDF carries the alignment, the bold and the images.
    cuerpo: textoPlano(
      rellenar(plantilla.cuerpo, {
        par: fila.par.nombre,
        PAR: fila.par.nombre.toUpperCase(),
        articulo: fila.articulo.titulo,
        revista: nombreRevista,
        REVISTA: nombreRevista.toUpperCase(),
        issn: datos.issn,
        indexaciones: datos.indexaciones,
        fecha: '14 de noviembre de 2026',
        anio: '2026',
        firma: '',
      }),
    ),
    firma: FIRMA_CONSTANCIA,
    fondo: plantilla.imagenes ? `Encabezado, pie y firma de «${plantilla.nombre}»` : null,
  }
}

/** Generates the constancia and sends the thank-you mail with it attached (RF-30, RF-31). */
function emitir(
  base: SeedRevista,
  revista: Revista,
  c: Constancia,
  usuario: string,
  reemision: boolean,
  conAgradecimiento = true,
): ResultadoEmision | null {
  const fila = filaDe(base, c)
  const asignacion = base.asignaciones.find((a) => a.id === c.asignacionId)
  if (!fila || !asignacion) return null

  const ahora = ahoraIso()
  c.estado = 'emitida'
  c.fechaEmision = ahora
  const plantilla = plantillaEnUso(revista, 'agradecimiento')
  const asunto = conAgradecimiento
    ? rellenar(plantilla.asunto ?? '', {
        revista: NOMBRE_EN_CORREO[revista],
        par: fila.par.nombre,
        articulo: fila.articulo.titulo,
      })
    : 'Constancia de participación como par evaluador'
  const estado: EstadoCorreo = fila.par.correo.toLowerCase().endsWith(DOMINIO_QUE_REBOTA)
    ? 'rebotado'
    : 'enviado'
  base.correos.unshift({
    id: `${revista}-cor-n${base.correos.length + 1}`,
    revista,
    articuloId: fila.articulo.id,
    asignacionId: asignacion.id,
    atendido: false,
    tipo: conAgradecimiento ? 'agradecimiento' : 'constancia',
    destinatario: fila.par.correo,
    asunto,
    fechaEnvio: ahora,
    estado,
  })
  const registrar = (accion: string, quien: string, tipo: 'constancia' | 'fallo') =>
    base.auditoria.unshift({
      id: `${revista}-aud-n${base.auditoria.length + 1}`,
      revista,
      articuloId: fila.articulo.id,
      tipo,
      accion,
      fecha: ahora,
      usuario: quien,
    })
  registrar(reemision ? 'Reemitió una constancia' : 'Emitió una constancia', usuario, 'constancia')
  registrar(`Envió la constancia al par ${asignacion.orden}`, 'Sistema', 'constancia')
  if (estado === 'rebotado') registrar('Envío fallido: la dirección rebotó', 'Sistema', 'fallo')

  const emitida = filaDe(base, c)
  return emitida ? { constancia: emitida, correo: { estado, destinatario: fila.par.correo } } : null
}

/** Body of an emit request; the thank-you text is included unless it says otherwise. */
async function opcionesDe(request: Request): Promise<{ conAgradecimiento: boolean }> {
  const cuerpo = (await request.json().catch(() => ({}))) as { conAgradecimiento?: boolean }
  return { conAgradecimiento: cuerpo.conAgradecimiento !== false }
}

export const handlersConstancias = [
  http.get('*/api/:revista/constancias', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const filas = filasDe(c.base)
    return HttpResponse.json({
      pendientes: filas
        .filter((f) => f.estado === 'pendiente')
        .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega)),
      emitidas: filas
        .filter((f) => f.estado === 'emitida')
        .sort((a, b) => (b.fechaEmision ?? '').localeCompare(a.fechaEmision ?? '')),
    })
  }),

  http.get('*/api/:revista/constancias/:id/vista-previa', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    asegurarConstancias(c.base)
    const constancia = c.base.constancias.find((k) => k.id === params.id)
    const fila = constancia ? filaDe(c.base, constancia) : null
    if (!fila) return error(404, 'Constancia no encontrada')
    return HttpResponse.json(vistaDe(c.revista, fila))
  }),

  // Registered before the ":id" route so "emitir-pendientes" is not read as an id.
  http.post('*/api/:revista/constancias/emitir-pendientes', async ({ params, request }) => {
    const c = contexto(params, request, 'emitir-constancia')
    if (!c.ok) return c.respuesta
    const { conAgradecimiento } = await opcionesDe(request)
    asegurarConstancias(c.base)
    const resultados = c.base.constancias
      .filter((k) => k.estado === 'pendiente')
      .flatMap((k) => {
        const r = emitir(c.base, c.revista, k, c.usuario.nombre, false, conAgradecimiento)
        return r ? [r] : []
      })
    return HttpResponse.json({
      emitidas: resultados.length,
      fallidos: resultados.filter((r) => r.correo.estado === 'rebotado').length,
      resultados,
    })
  }),

  http.post('*/api/:revista/constancias/:id/emitir', async ({ params, request }) => {
    const c = contexto(params, request, 'emitir-constancia')
    if (!c.ok) return c.respuesta
    const { conAgradecimiento } = await opcionesDe(request)
    asegurarConstancias(c.base)
    const constancia = c.base.constancias.find((k) => k.id === params.id)
    if (!constancia) return error(404, 'Constancia no encontrada')
    if (constancia.estado === 'emitida') return error(409, 'La constancia ya fue emitida')
    const resultado = emitir(c.base, c.revista, constancia, c.usuario.nombre, false, conAgradecimiento)
    if (!resultado) return error(404, 'Evaluación no encontrada')
    return HttpResponse.json(resultado)
  }),

  http.post('*/api/:revista/constancias/:id/reenviar', ({ params, request }) => {
    const c = contexto(params, request, 'emitir-constancia')
    if (!c.ok) return c.respuesta
    const constancia = c.base.constancias.find((k) => k.id === params.id)
    if (!constancia) return error(404, 'Constancia no encontrada')
    if (constancia.estado !== 'emitida')
      return error(409, 'Solo se reenvía una constancia ya emitida')
    const resultado = emitir(c.base, c.revista, constancia, c.usuario.nombre, true)
    if (!resultado) return error(404, 'Evaluación no encontrada')
    return HttpResponse.json(resultado)
  }),
]
