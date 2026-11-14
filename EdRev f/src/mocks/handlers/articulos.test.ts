import { tokenMock } from '../token'
import { ADMINISTRADORA, AUXILIAR } from '../seed/usuarios'
import type { ArticuloDetalle, RespuestaListado } from '@/types/articulo'

const BASE = 'http://localhost/api'

function llamar(
  ruta: string,
  {
    usuario = ADMINISTRADORA,
    metodo = 'GET',
    cuerpo,
  }: { usuario?: typeof ADMINISTRADORA | null; metodo?: string; cuerpo?: unknown } = {},
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (usuario) headers.Authorization = `Bearer ${tokenMock(usuario.id)}`
  return fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
}

describe('articles API (mock)', () => {
  it('requires a session', async () => {
    expect((await llamar('/reep/articulos', { usuario: null })).status).toBe(401)
  })

  it('rejects an unknown journal', async () => {
    expect((await llamar('/xyz/articulos')).status).toBe(404)
  })

  it('lists only the articles of the requested journal, paginated', async () => {
    const reep = (await (await llamar('/reep/articulos?porPagina=50')).json()) as RespuestaListado
    const ire = (await (await llamar('/ire/articulos?porPagina=50')).json()) as RespuestaListado
    expect(reep.total).toBe(20)
    expect(ire.total).toBe(20)
    const titulosReep = new Set(reep.items.map((a) => a.titulo))
    expect(ire.items.some((a) => titulosReep.has(a.titulo))).toBe(false)

    const pagina = (await (
      await llamar('/reep/articulos?pagina=2&porPagina=6')
    ).json()) as RespuestaListado
    expect(pagina.items).toHaveLength(6)
    expect(pagina.total).toBe(20)
  })

  it('filters by status, text (accent-insensitive) and date range', async () => {
    const archivados = (await (
      await llamar('/reep/articulos?estado=archivado')
    ).json()) as RespuestaListado
    expect(archivados.items.map((a) => a.id)).toEqual(['2026-007'])

    const porTexto = (await (
      await llamar('/reep/articulos?q=alfabetizacion')
    ).json()) as RespuestaListado
    expect(porTexto.items[0]?.id).toBe('2026-034')

    const rango = (await (
      await llamar('/reep/articulos?desde=2026-10-01&hasta=2026-10-31&porPagina=50')
    ).json()) as RespuestaListado
    expect(rango.items.length).toBeGreaterThan(0)
    expect(
      rango.items.every(
        (a) => a.fechaPostulacion >= '2026-10-01' && a.fechaPostulacion <= '2026-10-31',
      ),
    ).toBe(true)
  })

  it('an article of one journal does not exist in the other', async () => {
    expect((await llamar('/reep/articulos/2026-034')).status).toBe(200)
    expect((await llamar('/ire/articulos/2026-034')).status).toBe(404)
  })

  it('detects a duplicated OJS number only within the journal', async () => {
    const enReep = (await (await llamar('/reep/articulos/existe?numeroOjs=2026-034')).json()) as {
      existe: boolean
    }
    const enIre = (await (await llamar('/ire/articulos/existe?numeroOjs=2026-034')).json()) as {
      existe: boolean
    }
    expect(enReep.existe).toBe(true)
    expect(enIre.existe).toBe(false)
  })

  it('creates an article with new and existing authors, in order', async () => {
    const respuesta = await llamar('/reep/articulos', {
      metodo: 'POST',
      cuerpo: {
        numeroOjs: '2026-035',
        titulo: 'Narrativas docentes e identidad profesional',
        tipo: 'investigacion',
        fechaPostulacion: '2026-11-03',
        autores: [
          { autorId: 'reep-au-3' },
          {
            nuevo: {
              nombre: 'Laura Sofía Rivera',
              correo: 'laura.rivera@umariana.edu.co',
              orcid: '0000-0001-0000-0001',
              filiacion: 'Universidad Mariana',
              pais: 'Colombia',
            },
          },
        ],
      },
    })
    expect(respuesta.status).toBe(201)
    const creado = (await respuesta.json()) as ArticuloDetalle
    expect(creado.estado).toBe('postulado')
    expect(creado.autores.map((a) => a.orden)).toEqual([1, 2])
    expect(creado.autores[0]?.nombre).toBe('María Fernanda Ruano')
    // The new author joins the common directory of both journals (RF-10)
    const total = async (ruta: string) =>
      ((await (await llamar(ruta)).json()) as { total: number }).total
    expect(await total('/reep/autores?q=rivera')).toBe(1)
    expect(await total('/ire/autores?q=rivera')).toBe(1)
    // …and the journal filter shows it only where it has articles
    expect(await total('/ire/autores?q=rivera&en=reep')).toBe(1)
    expect(await total('/reep/autores?q=rivera&en=ire')).toBe(0)
  })

  it('refuses more than seven authors', async () => {
    const autores = Array.from({ length: 8 }, (_, i) => ({ autorId: `reep-au-${i + 1}` }))
    const respuesta = await llamar('/reep/articulos', {
      metodo: 'POST',
      cuerpo: {
        numeroOjs: '2026-099',
        titulo: 'x',
        tipo: 'revision',
        fechaPostulacion: '2026-11-03',
        autores,
      },
    })
    expect(respuesta.status).toBe(422)
  })

  it('registers committee rounds with the anti-plagiarism report, without a limit of rounds', async () => {
    const ronda = (cuerpo: Record<string, unknown>, usuario?: typeof AUXILIAR) =>
      llamar('/reep/articulos/2026-032/rondas', { metodo: 'POST', cuerpo, usuario })
    const base = { coincidencias: 18, atribuidoIa: 5, observacion: 'Ajustar el resumen.' }

    expect((await ronda({ ...base, coincidencias: 120, resultado: 'ajustes' })).status).toBe(422)
    expect((await ronda({ ...base, resultado: 'otro' })).status).toBe(422)

    const primera = await ronda({ ...base, resultado: 'ajustes' }, AUXILIAR)
    expect(primera.status).toBe(201)
    const tras1 = (await primera.json()) as ArticuloDetalle
    expect(tras1.estado).toBe('en-revision')
    expect(tras1.coincidencias).toBe(18)
    expect(tras1.rondasComite).toHaveLength(1)

    await ronda({ ...base, resultado: 'ajustes' })
    const tercera = (await (
      await ronda({ ...base, coincidencias: 9, resultado: 'aprobado', observacion: '' })
    ).json()) as ArticuloDetalle
    expect(tercera.rondasComite.map((r) => [r.numero, r.resultado])).toEqual([
      [1, 'ajustes'],
      [2, 'ajustes'],
      [3, 'aprobado'],
    ])
    expect(tercera.coincidencias).toBe(9)
    expect(tercera.rondasComite[0]?.usuario).toBe('Andrea Villota')
  })

  it('a rejected round leaves the article Rechazado, with no more rounds', async () => {
    const r = await llamar('/reep/articulos/2026-032/rondas', {
      metodo: 'POST',
      cuerpo: { coincidencias: 40, atribuidoIa: 10, resultado: 'rechazado', observacion: 'x' },
    })
    expect(((await r.json()) as ArticuloDetalle).estado).toBe('rechazado')
    const otra = await llamar('/reep/articulos/2026-032/rondas', {
      metodo: 'POST',
      cuerpo: { coincidencias: 40, atribuidoIa: 10, resultado: 'aprobado', observacion: '' },
    })
    expect(otra.status).toBe(409)
  })

  it('moves an article in committee review to the other journal, as many times as needed', async () => {
    const ida = await llamar('/reep/articulos/2026-021/trasladar', {
      metodo: 'POST',
      usuario: AUXILIAR,
    })
    expect(ida.status).toBe(200)
    expect(((await ida.json()) as ArticuloDetalle).revista).toBe('ire')
    expect((await llamar('/reep/articulos/2026-021')).status).toBe(404)
    const enIre = (await (await llamar('/ire/articulos/2026-021')).json()) as ArticuloDetalle
    expect(enIre.rondasComite).toHaveLength(1)
    expect(enIre.autores.length).toBeGreaterThan(0)
    const historial = (await (await llamar('/ire/articulos/2026-021/historial')).json()) as {
      auditoria: Array<{ tipo: string; accion: string }>
    }
    expect(historial.auditoria[0]).toMatchObject({
      tipo: 'traslado',
      accion: 'Cambió el artículo de Educación y Pedagogía a Investigium IRE',
    })
    // …and back again
    expect((await llamar('/ire/articulos/2026-021/trasladar', { metodo: 'POST' })).status).toBe(200)
    expect((await llamar('/reep/articulos/2026-021')).status).toBe(200)
  })

  it('an article changes journal at any stage: with peers, approved and published (RF-07)', async () => {
    // 2026-034 has peers assigned; a published article is taken from the list by its issue.
    const conPares = await llamar('/reep/articulos/2026-034/trasladar', { metodo: 'POST' })
    expect(conPares.status).toBe(200)
    const movido = (await conPares.json()) as ArticuloDetalle
    expect(movido.revista).toBe('ire')
    expect(movido.asignaciones.length).toBeGreaterThan(0)

    const publicados = (await (
      await llamar('/reep/articulos?publicacion=10-2&porPagina=50')
    ).json()) as RespuestaListado
    const publicado = publicados.items[0]
    if (!publicado) throw new Error('seed missing: no published article')
    const r = await llamar(`/reep/articulos/${publicado.id}/trasladar`, { metodo: 'POST' })
    expect(r.status).toBe(200)
    expect(((await r.json()) as ArticuloDetalle).publicacion).toBeNull()
    const historial = (await (await llamar(`/ire/articulos/${publicado.id}/historial`)).json()) as {
      auditoria: Array<{ accion: string }>
    }
    expect(historial.auditoria[0]?.accion).toContain('se quitó su publicación')
  })

  it('an open article from a previous year passes by itself to the current year (anio filter)', async () => {
    const anioActual = new Date().getFullYear()
    const crear = async (numero: string, fecha: string) => {
      const r = await llamar('/reep/articulos', {
        metodo: 'POST',
        cuerpo: {
          numeroOjs: numero,
          titulo: `Pendiente ${numero}`,
          tipo: 'reflexion',
          fechaPostulacion: fecha,
          autores: [{ autorId: 'reep-au-3' }],
        },
      })
      return (await r.json()) as ArticuloDetalle
    }
    const pendiente = await crear('2024-901', '2024-09-10')
    const cerrado = await crear('2024-902', '2024-09-12')
    await llamar(`/reep/articulos/${cerrado.id}/cerrar`, {
      metodo: 'POST',
      cuerpo: { estado: 'rechazado', motivo: 'No cumple', publicacion: null },
    })

    const lista = async (anio: number) =>
      (
        (await (
          await llamar(`/reep/articulos?anio=${anio}&porPagina=100`)
        ).json()) as RespuestaListado
      ).items
    const delActual = await lista(anioActual)
    expect(delActual.find((a) => a.id === pendiente.id)?.fechaPostulacion).toBe('2024-09-10')
    expect(delActual.some((a) => a.id === cerrado.id)).toBe(false)
    const de2024 = await lista(2024)
    expect(de2024.some((a) => a.id === cerrado.id)).toBe(true)
    expect(de2024.some((a) => a.id === pendiente.id)).toBe(false)

    const anios = (await (await llamar('/reep/articulos/anios')).json()) as number[]
    expect(anios).toEqual(expect.arrayContaining([anioActual, 2024]))
    expect(anios[0]).toBe(anioActual)
  })

  it('closes the process with a reason; approving needs volume and number together', async () => {
    const cerrar = (cuerpo: Record<string, unknown>, usuario?: typeof AUXILIAR) =>
      llamar('/reep/articulos/2026-034/cerrar', { metodo: 'POST', cuerpo, usuario })
    expect((await cerrar({ estado: 'aprobado', motivo: ' ', publicacion: null })).status).toBe(422)
    expect(
      (await cerrar({ estado: 'aprobado', motivo: 'Publicable', publicacion: null })).status,
    ).toBe(422)
    const ok = await cerrar(
      { estado: 'aprobado', motivo: 'Publicable', publicacion: { volumen: 11, numero: 1 } },
      AUXILIAR,
    )
    expect(ok.status).toBe(200)
    const cerrado = (await ok.json()) as ArticuloDetalle
    expect(cerrado.estado).toBe('aprobado')
    expect(cerrado.publicacion).toEqual({ volumen: 11, numero: 1 })
    expect(cerrado.asignaciones.length).toBeGreaterThan(0) // everything is kept
    expect((await cerrar({ estado: 'rechazado', motivo: 'x', publicacion: null })).status).toBe(409)
    const historial = (await (await llamar('/reep/articulos/2026-034/historial')).json()) as {
      auditoria: Array<{ tipo: string }>
    }
    expect(historial.auditoria[0]?.tipo).toBe('cierre')
  })

  it('lists the publications most recent first and filters by them', async () => {
    const lista = (await (await llamar('/reep/publicaciones')).json()) as Array<{
      valor: string
      etiqueta: string
    }>
    expect(lista[0]).toEqual({ valor: '10-2', etiqueta: 'Vol. 10 n.º 2' })
    expect(lista.map((p) => p.valor)).toEqual(['10-2', '10-1', '9-2', '9-1', '8-2'])
    const filtrados = (await (
      await llamar('/reep/articulos?publicacion=10-2&porPagina=50')
    ).json()) as { items: Array<{ publicacion: unknown }> }
    expect(filtrados.items.length).toBe(2)
    expect(
      filtrados.items.every((a) => JSON.stringify(a.publicacion) === '{"volumen":10,"numero":2}'),
    ).toBe(true)
  })

  it('reopening keeps everything and records the reason in the history', async () => {
    const cuerpo = {
      motivo: 'El autor escribió anunciando las modificaciones.',
      estado: 'en-revision',
    }
    expect(
      (await llamar('/reep/articulos/2026-034/reabrir', { metodo: 'POST', cuerpo })).status,
    ).toBe(409)

    const antes = (await (await llamar('/reep/articulos/2026-007')).json()) as ArticuloDetalle
    const ok = await llamar('/reep/articulos/2026-007/reabrir', { metodo: 'POST', cuerpo })
    expect(ok.status).toBe(200)
    const despues = (await ok.json()) as ArticuloDetalle
    expect(despues.estado).toBe('en-revision')
    expect(despues.autores).toEqual(antes.autores)
    expect(despues.coincidencias).toEqual(antes.coincidencias)
    expect(despues.rondasComite).toEqual(antes.rondasComite)
    const historial = (await (await llamar('/reep/articulos/2026-007/historial')).json()) as {
      auditoria: Array<{ tipo: string; accion: string }>
    }
    expect(historial.auditoria[0]).toMatchObject({
      tipo: 'reapertura',
      accion: 'Retomó el proceso: El autor escribió anunciando las modificaciones.',
    })
  })
})
