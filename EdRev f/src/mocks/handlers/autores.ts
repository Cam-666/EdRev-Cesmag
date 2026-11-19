/*
 * MSW handlers for the common author directory (RF-10): one directory for both journals, searchable
 * by name or ORCID and filterable by journal (`en=reep|ire`, journals where the author has
 * articles). The author record lists all its articles with their journal and state (RF-11).
 */
import { http, HttpResponse } from 'msw'
import { autorPorId, autores, baseDe, registrarAutor } from '../db'
import { ahoraIso, contexto, error, sinTildes } from './util'
import type { ArticuloDeAutor, DatosAutor } from '@/types/autor'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const LAS_DOS = Object.keys(REVISTAS) as Revista[]

function articulosDe(id: string): ArticuloDeAutor[] {
  return LAS_DOS.flatMap((r) =>
    baseDe(r)
      .articulos.filter((a) => a.autoresIds.includes(id))
      .map((a) => ({
        id: a.id,
        revista: r,
        numeroOjs: a.numeroOjs,
        titulo: a.titulo,
        estado: a.estado,
        fechaPostulacion: a.fechaPostulacion,
      })),
  ).sort((x, y) => y.fechaPostulacion.localeCompare(x.fechaPostulacion))
}

export const handlersAutores = [
  http.get('*/api/:revista/autores/filtros', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const unicos = (v: string[]) =>
      [...new Set(v.map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
    return HttpResponse.json({
      paises: unicos(autores().map((a) => a.pais)),
      filiaciones: unicos(autores().map((a) => a.filiacion)),
    })
  }),

  http.get('*/api/:revista/autores', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const q = sinTildes(url.searchParams.get('q') ?? '').trim()
    const en = url.searchParams.get('en')
    const pais = url.searchParams.get('pais') ?? ''
    const filiacion = url.searchParams.get('filiacion') ?? ''
    const orcid = url.searchParams.get('orcid') ?? ''
    const articulos = url.searchParams.get('articulos') ?? ''
    const limite = Math.max(1, Number(url.searchParams.get('limite') ?? 50))

    const conArticulos = autores().map((a) => {
      const articulos = articulosDe(a.id)
      return {
        ...a,
        totalArticulos: articulos.length,
        revistas: LAS_DOS.filter((r) => articulos.some((x) => x.revista === r)),
      }
    })
    const coincidencias = conArticulos
      .filter((a) => !q || sinTildes(a.nombre).includes(q) || a.orcid.includes(q))
      .filter((a) => !en || a.revistas.includes(en as Revista))
      .filter((a) => !pais || a.pais === pais)
      .filter((a) => !filiacion || a.filiacion === filiacion)
      .filter((a) => !orcid || (orcid === 'con') === Boolean(a.orcid))
      .filter(
        (a) =>
          !articulos ||
          (articulos === 'uno' && a.totalArticulos === 1) ||
          (articulos === 'varios' && a.totalArticulos > 1),
      )
      .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
    return HttpResponse.json({ items: coincidencias.slice(0, limite), total: coincidencias.length })
  }),

  http.get('*/api/:revista/autores/:id', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const autor = autorPorId(String(params.id))
    if (!autor) return error(404, 'Autor no encontrado')
    return HttpResponse.json(autor)
  }),

  http.patch('*/api/:revista/autores/:id', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const autor = autorPorId(String(params.id))
    if (!autor) return error(404, 'Autor no encontrado')
    const cambios = (await request.json()) as Partial<DatosAutor>
    if (cambios.orcid && autores().some((a) => a.id !== autor.id && a.orcid === cambios.orcid)) {
      return error(409, 'Ya existe un autor con ese ORCID')
    }
    Object.assign(autor, cambios)
    // The change is traced in the history of every article of the author, in its journal.
    for (const a of articulosDe(autor.id)) {
      const base = baseDe(a.revista)
      base.auditoria.unshift({
        id: `${a.revista}-aud-n${base.auditoria.length + 1}`,
        revista: a.revista,
        articuloId: a.id,
        tipo: 'edicion',
        accion: `Editó la ficha del autor ${autor.nombre}`,
        fecha: ahoraIso(),
        usuario: c.usuario.nombre,
      })
    }
    return HttpResponse.json(autor)
  }),

  http.get('*/api/:revista/autores/:id/articulos', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const autor = autorPorId(String(params.id))
    if (!autor) return error(404, 'Autor no encontrado')
    return HttpResponse.json(articulosDe(autor.id))
  }),

  http.post('*/api/:revista/autores', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as DatosAutor
    if (datos.orcid.trim() && autores().some((a) => a.orcid === datos.orcid.trim())) {
      return error(409, 'Ya existe un autor con ese ORCID en el directorio')
    }
    return HttpResponse.json(registrarAutor(c.revista, datos), { status: 201 })
  }),
]
