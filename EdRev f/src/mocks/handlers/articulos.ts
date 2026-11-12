/*
 * MSW handlers for articles of a journal: list with filters and pagination, sheet, creation,
 * edition, rounds of the committee review with the anti-plagiarism report, change of journal
 * during that review, observations, history and reopening.
 * Covers: RF-01..RF-08, RF-26, RF-35, RF-36, RF-41. Simulates the backend; permissions are
 * enforced here the way the real API will (the frontend guards are only for experience).
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, baseDe, registrarAutor } from '../db'
import type { SeedRevista } from '../seed/fabrica'
import { ahoraIso, contexto, error, sinTildes } from './util'
import { puedeRegistrarRonda, puedeTrasladar } from '@/lib/dominio/comite'
import type {
  Articulo,
  ArticuloDetalle,
  ArticuloListado,
  EdicionArticulo,
  EstadoArticulo,
  NuevaRonda,
  NuevoArticulo,
  ResultadoRonda,
} from '@/types/articulo'
import type { AutorDeArticulo } from '@/types/autor'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { EntradaAuditoria, TipoAuditoria } from '@/types/historial'

const MAX_AUTORES = 7
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
        },
      ]
    })
  return {
    ...resto,
    autores,
    asignaciones,
    totalObservaciones: base.observaciones.filter((o) => o.articuloId === a.id).length,
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
    numeroPublicacion: a.numeroPublicacion,
    paresRespondieron: asignadas.filter(
      (x) => x.estado !== 'invitado' && x.estado !== 'segundo-intento',
    ).length,
    paresAsignados: asignadas.length,
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
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Math.max(1, Number(url.searchParams.get('porPagina') ?? 6))

    const filtrados = c.base.articulos
      .filter((a) => !q || sinTildes(a.titulo).includes(q) || sinTildes(a.numeroOjs).includes(q))
      .filter((a) => !estado || a.estado === estado)
      .filter((a) => !publicacion || a.numeroPublicacion === publicacion)
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
    const lista = [
      ...new Set(
        c.base.articulos.flatMap((a) => (a.numeroPublicacion ? [a.numeroPublicacion] : [])),
      ),
    ]
    return HttpResponse.json(lista.sort().reverse())
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
      numeroPublicacion: null,
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
    if (cambios.numeroPublicacion !== undefined) {
      articulo.numeroPublicacion = cambios.numeroPublicacion?.trim() || null
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
    if (!RESULTADOS.includes(ronda.resultado)) return error(422, 'Seleccione el resultado')

    articulo.coincidencias = ronda.coincidencias
    articulo.atribuidoIa = ronda.atribuidoIa
    const numero = articulo.rondasComite.length + 1
    articulo.rondasComite.push({
      id: `${articulo.id}-r${numero}`,
      numero,
      resultado: ronda.resultado,
      observacion: ronda.observacion.trim(),
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    // Rechazado closes the article without peers; otherwise it stays in review until a peer accepts.
    articulo.estado = ronda.resultado === 'rechazado' ? 'rechazado' : 'en-revision'
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'revision',
      `Registró la ronda ${numero} de la revisión del comité: ${ETIQUETA_RONDA[ronda.resultado]}`,
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo), { status: 201 })
  }),

  http.post('*/api/:revista/articulos/:id/trasladar', ({ params, request }) => {
    const c = contexto(params, request, 'registrar-revision')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const tienePares = c.base.asignaciones.some((x) => x.articuloId === articulo.id)
    if (!puedeTrasladar(articulo, tienePares)) {
      return error(
        409,
        'El artículo ya no está en revisión del comité: no puede cambiar de revista',
      )
    }
    const destino: Revista = c.revista === 'reep' ? 'ire' : 'reep'
    const otra = baseDe(destino)
    if (otra.articulos.some((a) => a.id === articulo.id)) {
      return error(409, `Ya existe un artículo con el número ${articulo.id} en la otra revista`)
    }
    // The article moves with its own records; nothing of the old journal keeps pointing at it.
    const propio = (x: { articuloId: string | null }) => x.articuloId === articulo.id
    c.base.articulos = c.base.articulos.filter((a) => a.id !== articulo.id)
    otra.observaciones.unshift(...c.base.observaciones.filter(propio))
    c.base.observaciones = c.base.observaciones.filter((x) => !propio(x))
    otra.auditoria.unshift(
      ...c.base.auditoria.filter(propio).map((x) => ({ ...x, revista: destino })),
    )
    c.base.auditoria = c.base.auditoria.filter((x) => !propio(x))
    articulo.revista = destino
    otra.articulos.unshift(articulo)
    auditar(
      otra,
      destino,
      articulo.id,
      'traslado',
      `Cambió el artículo de ${REVISTAS[c.revista].nombreCorto} a ${REVISTAS[destino].nombreCorto}`,
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

  http.get('*/api/:revista/articulos/:id/observaciones', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json(c.base.observaciones.filter((o) => o.articuloId === params.id))
  }),

  http.post('*/api/:revista/articulos/:id/observaciones', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    const { texto } = (await request.json()) as { texto: string }
    if (!texto.trim()) return error(422, 'La observación no puede estar vacía')
    const nueva = {
      id: `${c.revista}-obs-n${c.base.observaciones.length + 1}`,
      articuloId: articulo.id,
      texto: texto.trim(),
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    }
    // Never overwrites an earlier one (HU-04): each observation is its own record.
    c.base.observaciones.unshift(nueva)
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'observacion',
      'Agregó una observación',
      c.usuario.nombre,
    )
    return HttpResponse.json(nueva, { status: 201 })
  }),

  http.get('*/api/:revista/articulos/:id/historial', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    return HttpResponse.json({
      correos: c.base.correos.filter((x) => x.articuloId === params.id),
      auditoria: c.base.auditoria.filter((x) => x.articuloId === params.id),
    })
  }),

  http.post('*/api/:revista/articulos/:id/reabrir', async ({ params, request }) => {
    const c = contexto(params, request, 'reabrir-articulo')
    if (!c.ok) return c.respuesta
    const articulo = c.base.articulos.find((a) => a.id === params.id)
    if (!articulo) return error(404, 'Artículo no encontrado')
    if (articulo.estado !== 'archivado') return error(409, 'El artículo no está archivado')
    const { motivo, estado } = (await request.json()) as { motivo: string; estado: EstadoArticulo }
    if (!motivo.trim()) return error(422, 'Escriba el motivo de la reapertura')

    // The whole earlier history (peers, concepts, mails, constancias) is kept untouched.
    articulo.estado = estado
    articulo.archivadoEn = null
    articulo.motivoArchivo = null
    c.base.observaciones.unshift({
      id: `${c.revista}-obs-n${c.base.observaciones.length + 1}`,
      articuloId: articulo.id,
      texto: `Se retomó el proceso: ${motivo.trim()}`,
      fecha: ahoraIso(),
      usuario: c.usuario.nombre,
    })
    auditar(
      c.base,
      c.revista,
      articulo.id,
      'reapertura',
      'Retomó el proceso del artículo',
      c.usuario.nombre,
    )
    return HttpResponse.json(detalle(c.base, articulo))
  }),
]
