/*
 * Manejadores MSW de los artículos de una revista: listado con filtros y paginación, ficha, creación, edición,
 * rondas de la revisión del comité con el reporte antiplagio, cambio de revista, historial, cierre (aprobado /
 * rechazado / archivado) y reapertura. Simulan el backend; los permisos se aplican aquí como los aplicará la API
 * real (los guardias de la interfaz son solo para la experiencia).
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, baseDe, registrarAutor } from '../db'
import { ultimoCorreo } from './asignaciones'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error, sinTildes } from './util'
import { anioDeGestion } from '@/lib/dominio/anios'
import { puedeRegistrarRonda } from '@/lib/dominio/comite'
import { resultadoDePares } from '@/lib/dominio/resultadoPares'
import {
  clavePublicacion,
  compararPublicaciones,
  etiquetaPublicacion,
} from '@/lib/dominio/publicacion'
import type {
  Articulo,
  ArticuloDetalle,
  ArticuloListado,
  CierreArticulo,
  EdicionArticulo,
  EstadoArticulo,
  NuevaRonda,
  NuevoArticulo,
  Publicacion,
  ResultadoRonda,
} from '@/types/articulo'
import type { AutorDeArticulo } from '@/types/autor'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { EntradaAuditoria, TipoAuditoria } from '@/types/historial'

const MAX_AUTORES = 7
const CERRADOS: readonly EstadoArticulo[] = ['aprobado', 'rechazado', 'archivado']
const ETIQUETA_CIERRE: Record<CierreArticulo['estado'], string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
}

function publicacionValida(p: Publicacion): boolean {
  return Number.isInteger(p.volumen) && Number.isInteger(p.numero) && p.volumen > 0 && p.numero > 0
}

const RESULTADOS: readonly ResultadoRonda[] = ['aprobado', 'rechazado', 'ajustes']

const ETIQUETA_RONDA: Record<ResultadoRonda, string> = {
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  ajustes: 'Requiere ajustes',
}

function detalle(base: SeedRevista, a: Articulo): ArticuloDetalle {
  const { autoresIds, ...resto } = a
  const autores: AutorDeArticulo[] = autoresIds.flatMap((id, i) => {
    const autor = autorPorId(id)
    return autor ? [{ ...autor, orden: i + 1 }] : []
  })
  const asignaciones = base.asignaciones
    .filter((x) => x.articuloId === a.id)
    .sort((x, y) => x.orden - y.orden)
    .flatMap((x) => {
      const par = base.pares.find((p) => p.id === x.parId)
      if (!par) return []
      const constancia = base.constancias.find((c) => c.asignacionId === x.id)
      return [
        {
          ...x,
          par: { id: par.id, nombre: par.nombre, correo: par.correo, universidad: par.universidad },
          constanciaEmitida: constancia?.estado === 'emitida',
          constanciaId: constancia?.id ?? null,
          ultimoCorreo: (() => {
            const u = ultimoCorreo(base, x.id)
            return u ? { tipo: u.tipo, estado: u.estado, atendido: u.atendido } : null
          })(),
        },
      ]
    })
  return {
    ...resto,
    autores,
    asignaciones,
    resultadoPares: resultadoDePares(asignaciones),
    migrado: base.auditoria.some((x) => x.articuloId === a.id && x.tipo === 'migracion'),
  }
}

function listado(base: SeedRevista, a: Articulo): ArticuloListado {
  const asignadas = base.asignaciones.filter((x) => x.articuloId === a.id)
  return {
    id: a.id,
    numeroOjs: a.numeroOjs,
    titulo: a.titulo,
    tipo: a.tipo,
    estado: a.estado,
    fechaPostulacion: a.fechaPostulacion,
    publicacion: a.publicacion,
    paresEntregaron: asignadas.filter((x) => x.estado === 'entrego').length,
    paresAsignados: asignadas.filter((x) => x.estado === 'acepto' || x.estado === 'entrego').length,
  }
}

function auditar(
  base: SeedRevista,
  revista: Articulo['revista'],
  articuloId: string,
  tipo: TipoAuditoria,
  accion: string,
  usuario: string,
): void {
  const entrada: EntradaAuditoria = {
    id: `${revista}-aud-n${base.auditoria.length + 1}`,
    revista,
    articuloId,
    tipo,
    accion,
    fecha: ahoraIso(),
    usuario,
  }
  base.auditoria.unshift(entrada)
}

export const handlersArticulos = [
  // Los años que tienen artículos (siempre el actual), del más nuevo al más antiguo.
  http.get('*/api/:revista/articulos/anios', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const anios = new Set(c.base.articulos.flatMap((a) => anioDeGestion(a) ?? []))
    anios.add(new Date().getFullYear())
    return HttpResponse.json([...anios].sort((x, y) => y - x))
  }),

  http.get('*/api/:revista/articulos', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const q = sinTildes(url.searchParams.get('q') ?? '')
    const estado = url.searchParams.get('estado')
    const publicacion = url.searchParams.get('publicacion')
    const desde = url.searchParams.get('desde')
    const hasta = url.searchParams.get('hasta')
    const sinResponder = url.searchParams.get('sinResponder') === '1'
    const anio = Number(url.searchParams.get('anio') ?? 0)
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Math.max(1, Number(url.searchParams.get('porPagina') ?? 6))

    const filtrados = c.base.articulos
      .filter((a) => !q || sinTildes(a.titulo).includes(q) || sinTildes(a.numeroOjs).includes(q))
      .filter((a) => !estado || a.estado === estado)
      .filter((a) => !anio || anioDeGestion(a) === anio)
      .filter(
        (a) => !publicacion || (a.publicacion && clavePublicacion(a.publicacion) === publicacion),
      )
      .filter((a) => !desde || a.fechaPostulacion >= desde)
      .filter((a) => !hasta || a.fechaPostulacion <= hasta)
      .filter(
        (a) =>
          !sinResponder ||
          c.base.asignaciones.some(
            (x) =>
              x.articuloId === a.id && (x.estado === 'invitado' || x.estado === 'segundo-intento'),
          ),
      )
      .sort((a, b) =>
        a.fechaPostulacion === b.fechaPostulacion
          ? b.numeroOjs.localeCompare(a.numeroOjs)
          : b.fechaPostulacion.localeCompare(a.fechaPostulacion),
      )
    const items = filtrados
      .slice((pagina - 1) * porPagina, pagina * porPagina)
      .map((a) => listado(c.base, a))
    return HttpResponse.json({ items, total: filtrados.length })
  }),

  http.get('*/api/:revista/articulos/existe', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const numero = new URL(request.url).searchParams.get('numeroOjs')?.trim() ?? ''
    const existente = c.base.articulos.find((a) => a.numeroOjs === numero)
    return HttpResponse.json({ existe: Boolean(existente), id: existente?.id ?? null })
  }),

  http.get('*/api/:revista/publicaciones', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const unicas = new Map<string, Publicacion>()
    for (const a of c.base.articulos) {
      if (a.publicacion) unicas.set(clavePublicacion(a.publicacion), a.publicacion)
    }
    // Del más reciente al más antiguo.
    const lista = [...unicas.values()]
      .sort(compararPublicaciones)
      .map((p) => ({ valor: clavePublicacion(p), etiqueta: etiquetaPublicacion(p) }))
    return HttpResponse.json(lista)
  }),

  http.get('*/api/:revista/articulos/:id', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    return HttpResponse.json(detalle(c.base, articulo))
  }),

  http.post('*/api/:revista/articulos', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as NuevoArticulo
    if (!datos.numeroOjs.trim() || !datos.titulo.trim())
      return error(422, 'Faltan datos del artículo')
    if (datos.autores.length < 1 || datos.autores.length > MAX_AUTORES) {
      return error(422, `El artículo admite de 1 a ${MAX_AUTORES} autores`)
    }

    const autoresIds = datos.autores.map((a): string =>
      'autorId' in a ? a.autorId : registrarAutor(c.revista, a.nuevo).id,
    )
    if (autoresIds.some((id) => !autorPorId(id))) {
      return error(422, 'Autor no encontrado en el directorio')
    }

    const numero = datos.numeroOjs.trim()
    const repetidos = c.base.articulos.filter((a) => a.numeroOjs === numero).length
    const articulo: Articulo = {
      id: repetidos === 0 ? numero : `${numero}-${repetidos + 1}`,
      revista: c.revista,
      numeroOjs: numero,
      titulo: datos.titulo.trim(),
      tipo: datos.tipo,
      estado: 'postulado',
      fechaPostulacion: datos.fechaPostulacion,
      publicacion: null,
      coincidencias: null,
      atribuidoIa: null,
      rondasComite: [],
      autoresIds,
      archivadoEn: null,
      motivoArchivo: null,
    }
    c.base.articulos.unshift(articulo)
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'registro',
      `Registró el artículo ${numero}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo), { status: 201 })
  }),

  http.patch('*/api/:revista/articulos/:id', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const cambios = (await request.json()) as EdicionArticulo
    if (cambios.titulo !== undefined) articulo.titulo = cambios.titulo.trim()
    if (cambios.tipo !== undefined) articulo.tipo = cambios.tipo
    if (cambios.publicacion !== undefined) {
      if (cambios.publicacion && !publicacionValida(cambios.publicacion)) {
        return error(422, 'Escriba el volumen y el número juntos')
      }
      articulo.publicacion = cambios.publicacion
    }
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'edicion',
      'Editó los datos del artículo',
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo))
  }),

  http.post('*/api/:revista/articulos/:id/rondas', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-revision')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const tienePares = c.base.asignaciones.some((x) => x.articuloId === articulo.id)
    if (!puedeRegistrarRonda(articulo, tienePares)) {
      return error(409, 'La revisión del comité ya terminó para este artículo')
    }
    const ronda = (await request.json()) as NuevaRonda
    const valido = (n: number | null) => n === null || (Number.isFinite(n) && n >= 0 && n <= 100)
    if (!valido(ronda.coincidencias) || !valido(ronda.atribuidoIa)) {
      return error(422, 'Los porcentajes deben estar entre 0 y 100')
    }
    if (ronda.coincidencias === null) {
      return error(422, 'Registre el porcentaje de coincidencias del reporte antiplagio')
    }
    // El comité elige el resultado.
    if (!RESULTADOS.includes(ronda.resultado)) return error(422, 'Seleccione el resultado')
    const resultado = ronda.resultado

    articulo.coincidencias = ronda.coincidencias
    articulo.atribuidoIa = ronda.atribuidoIa
    const numero = articulo.rondasComite.length + 1
    articulo.rondasComite.push({
      id: `${articulo.id}-r${numero}`,
      numero,
      resultado,
      observacion: ronda.observacion.trim(),
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    // Ningún resultado cierra el proceso: el artículo sigue en revisión.
    articulo.estado = 'en-revision'
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'revision',
      `Registró la ronda ${numero} de la revisión del comité: ${ETIQUETA_RONDA[resultado]}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo), { status: 201 })
  }),

  http.post('*/api/:revista/articulos/:id/trasladar', ({ params, request }) => {
    const c = contexto(params, request, 'registrar-revision')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const destino: Revista = c.revista === 'reep' ? 'ire' : 'reep'
    const otra = baseDe(destino)
    if (otra.articulos.some((a) => a.id === articulo.id)) {
      return error(409, `Ya existe un artículo con el número ${articulo.id} en la otra revista`)
    }
    // El artículo se mueve con sus propios registros; nada de la revista anterior sigue apuntando a él.
    const propio = (x: { articuloId: string | null }) => x.articuloId === articulo.id
    c.base.articulos = c.base.articulos.filter((a) => a.id !== articulo.id)
    otra.auditoria.unshift(
      ...c.base.auditoria.filter(propio).map((x) => ({ ...x, revista: destino })),
    )
    c.base.auditoria = c.base.auditoria.filter((x) => !propio(x))
    // En cualquier etapa. Las evaluaciones, correos y constancias se van con el artículo (los pares son una base
    // común); el volumen y el número pertenecen a la revista, por eso se borran.
    const asignaciones = c.base.asignaciones.filter(propio)
    const ids = new Set(asignaciones.map((x) => x.id))
    c.base.asignaciones = c.base.asignaciones.filter((x) => !propio(x))
    otra.asignaciones.push(...asignaciones)
    otra.correos.unshift(...c.base.correos.filter(propio).map((x) => ({ ...x, revista: destino })))
    c.base.correos = c.base.correos.filter((x) => !propio(x))
    otra.constancias.push(...c.base.constancias.filter((x) => ids.has(x.asignacionId)))
    c.base.constancias = c.base.constancias.filter((x) => !ids.has(x.asignacionId))
    const quitada = articulo.publicacion
      ? `; se quitó su publicación Vol. ${articulo.publicacion.volumen} n.º ${articulo.publicacion.numero}, que era de la otra revista`
      : ''
    articulo.publicacion = null
    articulo.revista = destino
    otra.articulos.unshift(articulo)
    auditar(
      otra,
      destino,
      articulo.id,
      'traslado',
      `Cambió el artículo de ${REVISTAS[c.revista].nombreCorto} a ${REVISTAS[destino].nombreCorto}${quitada}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(otra, articulo))
  }),

  http.post('*/api/:revista/articulos/:id/autores', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    if (articulo.autoresIds.length >= MAX_AUTORES) {
      return error(422, `El artículo admite hasta ${MAX_AUTORES} autores`)
    }
    const entrada = (await request.json()) as NuevoArticulo['autores'][number]
    let autorId: string
    if ('autorId' in entrada) {
      autorId = entrada.autorId
      if (!autorPorId(autorId)) return error(422, 'Autor no encontrado en el directorio')
      if (articulo.autoresIds.includes(autorId))
        return error(409, 'El autor ya está en el artículo')
    } else {
      autorId = registrarAutor(c.revista, entrada.nuevo).id
    }
    articulo.autoresIds.push(autorId)
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'edicion',
      'Agregó un autor al artículo',
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo), { status: 201 })
  }),

  http.get('*/api/:revista/articulos/:id/historial', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json({
      correos: c.base.correos.filter((x) => x.articuloId === params.id),
      auditoria: c.base.auditoria.filter((x) => x.articuloId === params.id),
    })
  }),

  // «No publicable» de los pares: abrir una nueva ronda del comité o rechazar el artículo definitivamente.
  http.post('*/api/:revista/articulos/:id/decision-pares', async ({ params, request }) => {
    const c = contexto(params, request, 'cerrar-articulo')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const { abrirRonda } = (await request.json()) as { abrirRonda: boolean }
    const resultado = resultadoDePares(
      c.base.asignaciones.filter((a) => a.articuloId === articulo.id),
    )
    if (resultado !== 'no-publicable' || articulo.estado !== 'en-evaluacion') {
      return error(
        409,
        'Este artículo no tiene una calificación de «No publicable» pendiente de decisión',
      )
    }
    articulo.estado = abrirRonda ? 'postulado' : 'rechazado'
    auditar(
      c.base,
      c.revista,
      articulo.id,
      abrirRonda ? 'revision' : 'cierre',
      abrirRonda
        ? 'Abrió una nueva ronda de revisión del comité: los pares evaluadores calificaron el artículo como no publicable'
        : 'Cerró el proceso como rechazado definitivamente: los pares evaluadores calificaron el artículo como no publicable',
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo))
  }),

  http.post('*/api/:revista/articulos/:id/cerrar', async ({ params, request }) => {
    const c = contexto(params, request, 'cerrar-articulo')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    if (CERRADOS.includes(articulo.estado))
      return error(409, 'El proceso del artículo ya está cerrado')
    const cierre = (await request.json()) as CierreArticulo
    if (!CERRADOS.includes(cierre.estado)) return error(422, 'Elija cómo se cierra el proceso')
    if (!cierre.motivo.trim()) return error(422, 'Escriba el motivo del cierre')
    if (cierre.estado === 'aprobado') {
      if (!cierre.publicacion || !publicacionValida(cierre.publicacion)) {
        return error(422, 'Al aprobarlo, registre el volumen y el número de la publicación')
      }
      articulo.publicacion = cierre.publicacion
    }
    // Todo lo registrado hasta ahora se conserva; solo cambia el estado.
    articulo.estado = cierre.estado
    if (cierre.estado === 'archivado') {
      articulo.archivadoEn = ahoraIso()
      articulo.motivoArchivo = cierre.motivo.trim()
    }
    // El motivo queda en el historial (no hay notas aparte).
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'cierre',
      `Cerró el proceso como ${ETIQUETA_CIERRE[cierre.estado]}: ${cierre.motivo.trim()}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo))
  }),

  http.post('*/api/:revista/articulos/:id/reabrir', async ({ params, request }) => {
    const c = contexto(params, request, 'reabrir-articulo')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    if (articulo.estado !== 'archivado') return error(409, 'El artículo no está archivado')
    const { motivo } = (await request.json()) as { motivo: string }
    if (!motivo.trim()) return error(422, 'Escriba el motivo de la reapertura')

    // Todo el historial anterior (pares, conceptos, correos, constancias) se conserva intacto.
    // Vuelve a «Postulado»: el comité debe revisarlo de nuevo.
    articulo.estado = 'postulado'
    articulo.archivadoEn = null
    articulo.motivoArchivo = null
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'reapertura',
      `Retomó el proceso: ${motivo.trim()}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo))
  }),
]
