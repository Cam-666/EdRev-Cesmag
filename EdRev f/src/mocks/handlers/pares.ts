/*
 * Manejadores MSW de la base de pares: listado con filtros, sugerencias de área temática, ficha, registro,
 * edición, bloqueo y desbloqueo. La base es común a las dos revistas. Simulan el backend; los permisos se aplican aquí.
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, baseDe, todasLasAsignaciones } from '../db'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error, sinTildes } from './util'
import { mismaInstitucion } from '@/lib/dominio/conflicto'
import { enCurso } from '@/lib/dominio/pares'
import {
  avisoParExistente,
  buscarParExistente,
  claveTexto,
  formaExistente,
} from '@/lib/dominio/parExistente'
import type {
  EstadoDisponibilidad,
  MotivoBloqueo,
  NuevoPar,
  ParDetalle,
  ParEvaluador,
  ParListado,
} from '@/types/par'

export function autoresDeArticulo(base: SeedRevista, articuloId: string) {
  const articulo = base.articulos.find((a) => a.id === articuloId)
  if (!articulo) return []
  return articulo.autoresIds.flatMap((id) => {
    const autor = autorPorId(id)
    return autor ? [autor] : []
  })
}

function evaluaciones(parId: string): number {
  return todasLasAsignaciones().filter((a) => a.parId === parId && a.estado === 'entrego').length
}

function disponibilidad(
  base: SeedRevista,
  par: ParEvaluador,
  articuloId: string | null,
): EstadoDisponibilidad {
  if (par.bloqueo) return 'bloqueado'
  const autores = articuloId ? autoresDeArticulo(base, articuloId) : []
  if (mismaInstitucion(par, autores)) return 'misma-institucion'
  return 'disponible'
}

function listado(base: SeedRevista, par: ParEvaluador, articuloId: string | null): ParListado {
  return {
    id: par.id,
    nombre: par.nombre,
    correo: par.correo,
    universidad: par.universidad,
    area: par.area,
    bloqueo: par.bloqueo,
    evaluaciones: evaluaciones(par.id),
    estado: disponibilidad(base, par, articuloId),
  }
}

function detalle(par: ParEvaluador): ParDetalle {
  // La base de pares es común: el historial reúne las evaluaciones de las dos revistas.
  const propias = (['reep', 'ire'] as const).flatMap((revista) =>
    baseDe(revista)
      .asignaciones.filter((a) => a.parId === par.id)
      .map((a) => ({ a, base: baseDe(revista), revista })),
  )
  const mias = propias.map((x) => x.a)
  const participaciones = propias
    .map(({ a, base, revista }) => {
      const articulo = base.articulos.find((x) => x.id === a.articuloId)
      const constancia = base.constancias.find((c) => c.asignacionId === a.id)
      return {
        asignacionId: a.id,
        articuloId: a.articuloId,
        revista,
        numeroOjs: articulo?.numeroOjs ?? a.articuloId,
        titulo: articulo?.titulo ?? '',
        estado: a.estado,
        concepto: a.concepto,
        constancia: constancia?.estado ?? null,
        fechaInvitacion: a.fechaInvitacion,
        fechaEntrega: a.fechaEntrega,
      }
    })
    .sort((x, y) => (x.fechaInvitacion < y.fechaInvitacion ? 1 : -1))
  const entregas = mias
    .flatMap((a) => (a.fechaEntrega ? [a.fechaEntrega] : []))
    .sort()
    .reverse()
  return {
    ...par,
    evaluacionesEntregadas: mias.filter((a) => a.estado === 'entrego').length,
    invitacionesSinResponder: mias.filter(
      (a) => a.estado === 'invitado' || a.estado === 'segundo-intento',
    ).length,
    ultimaParticipacion: entregas[0] ?? participaciones[0]?.fechaInvitacion ?? null,
    participaciones,
  }
}

export const handlersPares = [
  http.get('*/api/:revista/pares', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const q = sinTildes(url.searchParams.get('q') ?? '').trim()
    const area = sinTildes(url.searchParams.get('area') ?? '').trim()
    const universidad = url.searchParams.get('universidad') ?? ''
    const estado = url.searchParams.get('estado') ?? 'disponibles'
    const articulo = url.searchParams.get('articulo')
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Math.max(1, Number(url.searchParams.get('porPagina') ?? 10))

    const todos = c.base.pares.map((p) => listado(c.base, p, articulo))
    // Los pares que se pueden asignar no tienen una evaluación en curso y no están ya en el artículo.
    const ocupados = new Set(
      todasLasAsignaciones()
        .filter((a) => enCurso(a) || a.articuloId === articulo)
        .map((a) => a.parId),
    )
    const filtrados = todos
      .filter((p) => !q || sinTildes(p.nombre).includes(q) || sinTildes(p.correo).includes(q))
      .filter((p) => !area || sinTildes(p.area).includes(area))
      .filter((p) => !universidad || claveTexto(p.universidad) === claveTexto(universidad))
      .filter((p) =>
        estado === 'bloqueados'
          ? p.estado === 'bloqueado'
          : estado === 'disponibles'
            ? p.estado !== 'bloqueado'
            : estado === 'asignables'
              ? p.estado !== 'bloqueado' && p.estado !== 'misma-institucion' && !ocupados.has(p.id)
              : true,
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    return HttpResponse.json({
      items: filtrados.slice((pagina - 1) * porPagina, pagina * porPagina),
      total: filtrados.length,
      totalBase: todos.length,
      totalBloqueados: todos.filter((p) => p.estado === 'bloqueado').length,
    })
  }),

  http.get('*/api/:revista/pares/areas', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const areas = [...new Set(c.base.pares.map((p) => p.area))].sort((a, b) => a.localeCompare(b))
    return HttpResponse.json(areas)
  }),

  http.get('*/api/:revista/pares/universidades', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    // "CESMAG" y "Cesmag" son la misma universidad: una entrada por clave de comparación
    const lista = [
      ...new Map(c.base.pares.map((p) => [claveTexto(p.universidad), p.universidad])).values(),
    ].sort((a, b) => a.localeCompare(b))
    return HttpResponse.json(lista)
  }),

  http.get('*/api/:revista/pares/:id', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const par = c.base.pares.find((p) => p.id === params.id)
    if (!par) return error(404, 'Par evaluador no encontrado')
    return HttpResponse.json(detalle(par))
  }),

  http.post('*/api/:revista/pares', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as NuevoPar
    if (
      !datos.nombre.trim() ||
      !datos.correo.trim() ||
      !datos.universidad.trim() ||
      !datos.area.trim()
    ) {
      return error(422, 'Complete nombre, correo, universidad y área temática')
    }
    const existente = buscarParExistente(c.base.pares, datos.nombre, datos.correo)
    if (existente) return error(409, avisoParExistente(existente))
    const par: ParEvaluador = {
      id: `${c.revista}-par-n${c.base.pares.length + 1}`,
      revista: c.revista,
      nombre: datos.nombre.trim(),
      profesion: (datos.profesion ?? '').trim(),
      correo: datos.correo.trim(),
      universidad: formaExistente(c.base.pares, 'universidad', datos.universidad),
      area: datos.area.trim(),
      bloqueo: null,
    }
    c.base.pares.push(par)
    c.base.auditoria.unshift({
      id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
      revista: c.revista,
      articuloId: null,
      tipo: 'registro',
      accion: `Registró al par ${par.nombre}`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    return HttpResponse.json(detalle(par), { status: 201 })
  }),

  http.patch('*/api/:revista/pares/:id', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const par = c.base.pares.find((p) => p.id === params.id)
    if (!par) return error(404, 'Par evaluador no encontrado')
    const cambios = (await request.json()) as Partial<
      Pick<ParEvaluador, 'nombre' | 'profesion' | 'correo' | 'universidad' | 'area'>
    >
    if (
      cambios.correo &&
      c.base.pares.some(
        (p) => p.id !== par.id && p.correo.toLowerCase() === cambios.correo?.toLowerCase(),
      )
    ) {
      return error(409, 'Ya existe un par con ese correo en la base de pares')
    }
    Object.assign(par, cambios)
    c.base.auditoria.unshift({
      id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
      revista: c.revista,
      articuloId: null,
      tipo: 'edicion',
      accion: `Editó los datos del par ${par.nombre}`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    return HttpResponse.json(detalle(par))
  }),

  http.post('*/api/:revista/pares/:id/bloquear', async ({ params, request }) => {
    const c = contexto(params, request, 'bloquear-par')
    if (!c.ok) return c.respuesta
    const par = c.base.pares.find((p) => p.id === params.id)
    if (!par) return error(404, 'Par evaluador no encontrado')
    if (par.bloqueo) return error(409, 'El par ya está bloqueado')
    const { motivo } = (await request.json()) as { motivo: MotivoBloqueo }
    par.bloqueo = { motivo, fecha: ahoraIso().slice(0, 10) }
    c.base.auditoria.unshift({
      id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
      revista: c.revista,
      articuloId: null,
      tipo: 'bloqueo',
      accion: `Bloqueó al par ${par.nombre}`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    return HttpResponse.json(detalle(par))
  }),

  http.post('*/api/:revista/pares/:id/desbloquear', async ({ params, request }) => {
    const c = contexto(params, request, 'desbloquear-par')
    if (!c.ok) return c.respuesta
    const par = c.base.pares.find((p) => p.id === params.id)
    if (!par) return error(404, 'Par evaluador no encontrado')
    if (!par.bloqueo) return error(409, 'El par no está bloqueado')
    const { motivo } = (await request.json()) as { motivo: string }
    if (!motivo.trim()) return error(422, 'Escriba el motivo del desbloqueo')
    par.bloqueo = null
    c.base.auditoria.unshift({
      id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
      revista: c.revista,
      articuloId: null,
      tipo: 'desbloqueo',
      accion: `Desbloqueó al par ${par.nombre}: ${motivo.trim()}`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    return HttpResponse.json(detalle(par))
  }),
]
