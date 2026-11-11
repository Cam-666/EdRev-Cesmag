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
    // The new author is a reusable record of REEP only.
    const buscar = (await (await llamar('/reep/autores?q=rivera')).json()) as { total: number }
    const buscarIre = (await (await llamar('/ire/autores?q=rivera')).json()) as { total: number }
    expect(buscar.total).toBe(1)
    expect(buscarIre.total).toBe(0)
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

  it('observations are appended, never overwritten, with date and author', async () => {
    const antes = (await (
      await llamar('/reep/articulos/2026-034/observaciones')
    ).json()) as unknown[]
    const nueva = await llamar('/reep/articulos/2026-034/observaciones', {
      metodo: 'POST',
      usuario: AUXILIAR,
      cuerpo: { texto: 'El autor solicitó ocho días de prórroga.' },
    })
    expect(nueva.status).toBe(201)
    const despues = (await (
      await llamar('/reep/articulos/2026-034/observaciones')
    ).json()) as Array<{ usuario: string; texto: string }>
    expect(despues).toHaveLength(antes.length + 1)
    expect(despues[0]).toMatchObject({
      usuario: 'Andrea Villota',
      texto: 'El autor solicitó ocho días de prórroga.',
    })
  })

  it('anti-plagiarism and committee review can be registered by the Auxiliar too', async () => {
    const cuerpo = { antiplagio: { coincidencias: 12, atribuidoIa: 4, observacion: '' } }
    const ok = await llamar('/reep/articulos/2026-034/revision', {
      metodo: 'PUT',
      usuario: AUXILIAR,
      cuerpo,
    })
    expect(ok.status).toBe(200)
    expect(((await ok.json()) as ArticuloDetalle).antiplagio).toMatchObject({
      coincidencias: 12,
      atribuidoIa: 4,
    })
  })

  it('reopening keeps the history, records the reason as an observation', async () => {
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
    expect(despues.antiplagio).toEqual(antes.antiplagio)
    expect(despues.totalObservaciones).toBe(antes.totalObservaciones + 1)
    const obs = (await (await llamar('/reep/articulos/2026-007/observaciones')).json()) as Array<{
      texto: string
    }>
    expect(obs[0]?.texto).toContain('El autor escribió anunciando las modificaciones.')
  })
})
