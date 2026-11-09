/*
 * MSW handlers for the authors of a journal: reusable records searchable by name or ORCID
 * (RF-10) with the number of articles of each author (RF-11). Never crosses journals.
 */
import { http, HttpResponse } from 'msw'
import { ahoraIso, contexto, error, sinTildes } from './util'
import type { ArticuloDeAutor, Autor, DatosAutor } from '@/types/autor'

export const handlersAutores = [
  http.get('*/api/:revista/autores', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const q = sinTildes(url.searchParams.get('q') ?? '').trim()
    const limite = Math.max(1, Number(url.searchParams.get('limite') ?? 50))

    const coincidencias = c.base.autores.filter(
      (a) => !q || sinTildes(a.nombre).includes(q) || a.orcid.includes(q),
    )
    const items = coincidencias.slice(0, limite).map((a) => ({
      ...a,
      totalArticulos: c.base.articulos.filter((x) => x.autoresIds.includes(a.id)).length,
    }))
    return HttpResponse.json({ items, total: coincidencias.length })
  }),

  http.get('*/api/:revista/autores/:id', ({ params, request }) => {
    const c = contexto(params, request)
    if (!c.ok) return c.respuesta
    const autor = c.base.autores.find((a) => a.id === params.id)
    if (!autor) return error(404, 'Autor no encontrado')
    return HttpResponse.json(autor)
  }),

  http.patch('*/api/:revista/autores/:id', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const autor = c.base.autores.find((a) => a.id === params.id)
    if (!autor) return error(404, 'Autor no encontrado')
    Object.assign(autor, (await request.json()) as Partial<DatosAutor>)
    const articulos = c.base.articulos.filter((a) => a.autoresIds.includes(autor.id))
    for (const a of articulos) {
      c.base.auditoria.unshift({
        id: `${c.revista}-aud-n${c.base.auditoria.length + 1}`,
        revista: c.revista,
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
    const autor = c.base.autores.find((a) => a.id === params.id)
    if (!autor) return error(404, 'Autor no encontrado')
    const articulos: ArticuloDeAutor[] = c.base.articulos
      .filter((a) => a.autoresIds.includes(autor.id))
      .sort((x, y) => y.fechaPostulacion.localeCompare(x.fechaPostulacion))
      .map((a) => ({ id: a.id, numeroOjs: a.numeroOjs, titulo: a.titulo, estado: a.estado }))
    return HttpResponse.json(articulos)
  }),

  http.post('*/api/:revista/autores', async ({ params, request }) => {
    const c = contexto(params, request, 'registrar-datos')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as DatosAutor
    if (c.base.autores.some((a) => a.orcid === datos.orcid.trim())) {
      return error(409, 'Ya existe un autor con ese ORCID en esta revista')
    }
    const nuevo: Autor = {
      id: `${c.revista}-au-n${c.base.autores.length + 1}`,
      revista: c.revista,
      ...datos,
    }
    c.base.autores.push(nuevo)
    return HttpResponse.json(nuevo, { status: 201 })
  }),
]
