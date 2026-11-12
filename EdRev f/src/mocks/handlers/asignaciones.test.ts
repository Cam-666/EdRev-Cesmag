import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { ArticuloDetalle } from '@/types/articulo'
import type { HistorialArticulo } from '@/types/historial'
import type { ParDetalle, ParListado, ResultadoAsignacion } from '@/types/par'

/** Today as yyyy-MM-dd (an invitation is dated now, so a delivery cannot be earlier). */
function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface ListaPares {
  items: ParListado[]
  total: number
  totalBase: number
  totalBloqueados: number
}

/** A new article; by default the committee approves it so it can receive peers (RF-19). */
async function articuloNuevo(
  revista: 'reep' | 'ire',
  numero: string,
  autorId: string,
  aprobado = true,
) {
  const r = await llamar(`/${revista}/articulos`, {
    metodo: 'POST',
    cuerpo: {
      numeroOjs: numero,
      titulo: `Artículo ${numero}`,
      tipo: 'investigacion',
      fechaPostulacion: '2026-10-01',
      autores: [{ autorId }],
    },
  })
  expect(r.status).toBe(201)
  const articulo = await json<ArticuloDetalle>(r)
  if (aprobado) await ronda(revista, articulo.id, 'aprobado')
  return articulo
}

function ronda(revista: 'reep' | 'ire', id: string, resultado: string) {
  return llamar(`/${revista}/articulos/${id}/rondas`, {
    metodo: 'POST',
    cuerpo: { coincidencias: 6, atribuidoIa: 2, resultado, observacion: '' },
  })
}

/** Peers that can be assigned to the article: not blocked and with no evaluation in progress. */
async function disponibles(revista: 'reep' | 'ire', articuloId: string): Promise<ParListado[]> {
  const r = await llamar(`/${revista}/pares?estado=asignables&articulo=${articuloId}&porPagina=50`)
  return (await json<ListaPares>(r)).items
}

/** Assigns a brand-new candidate (saved in the base and invited); the seed has few free peers. */
async function candidato(articuloId: string, n: number): Promise<ResultadoAsignacion> {
  const r = await llamar(`/reep/articulos/${articuloId}/asignaciones`, {
    metodo: 'POST',
    cuerpo: {
      nuevo: {
        nombre: `Candidato ${n}`,
        correo: `candidato${n}.${articuloId}@udenar.edu.co`,
        universidad: 'Universidad de Nariño',
        area: 'Educación rural',
      },
    },
  })
  return json<ResultadoAsignacion>(r)
}

function responder(id: string, respuesta: string) {
  return llamar(`/reep/asignaciones/${id}/respuesta`, { metodo: 'POST', cuerpo: { respuesta } })
}

async function asignar(
  revista: 'reep' | 'ire',
  articulo: string,
  parId: string,
  usuario = undefined as typeof AUXILIAR | undefined,
) {
  return llamar(`/${revista}/articulos/${articulo}/asignaciones`, {
    metodo: 'POST',
    cuerpo: { parId },
    usuario,
  })
}

describe('peers API (mock)', () => {
  it('each journal has its own peer base and thematic areas', async () => {
    const reep = await json<ListaPares>(await llamar('/reep/pares?estado=todos&porPagina=50'))
    const ire = await json<ListaPares>(await llamar('/ire/pares?estado=todos&porPagina=50'))
    expect(reep.totalBase).toBe(15)
    expect(ire.totalBase).toBe(15)
    expect(reep.items.some((p) => ire.items.some((q) => q.id === p.id))).toBe(false)

    const areasReep = await json<string[]>(await llamar('/reep/pares/areas'))
    const areasIre = await json<string[]>(await llamar('/ire/pares/areas'))
    expect(areasReep).toContain('Educación inclusiva')
    expect(areasIre).toContain('Memoria y conflicto')
    expect(areasReep.some((a) => areasIre.includes(a))).toBe(false)
  })

  it('filters by area and university, and by availability', async () => {
    const porArea = await json<ListaPares>(
      await llamar('/reep/pares?estado=todos&area=educacion%20inclusiva'),
    )
    expect(porArea.items.length).toBeGreaterThan(0)
    expect(porArea.items.every((p) => p.area === 'Educación inclusiva')).toBe(true)

    const porUni = await json<ListaPares>(
      await llamar(
        `/reep/pares?estado=todos&universidad=${encodeURIComponent('Universidad Mariana')}`,
      ),
    )
    expect(porUni.items.every((p) => p.universidad === 'Universidad Mariana')).toBe(true)

    const disponibles = await json<ListaPares>(await llamar('/reep/pares?porPagina=50'))
    expect(disponibles.items.every((p) => p.estado !== 'bloqueado')).toBe(true)
    const bloqueados = await json<ListaPares>(await llamar('/reep/pares?estado=bloqueados'))
    expect(bloqueados.total).toBe(4)
    expect(bloqueados.items.every((p) => p.bloqueo !== null && p.estado === 'bloqueado')).toBe(true)
  })

  it('marks "Conflicto posible" for Universidad CESMAG and, with an article, for its authors university', async () => {
    const sinArticulo = await json<ListaPares>(await llamar('/reep/pares?porPagina=50'))
    const cesmag = sinArticulo.items.find((p) => p.universidad === 'Universidad CESMAG')
    expect(cesmag?.estado).toBe('conflicto')

    // 2026-034 has an author from Universidad Mariana: a Mariana peer conflicts there only.
    const conArticulo = await json<ListaPares>(
      await llamar('/reep/pares?porPagina=50&articulo=2026-034'),
    )
    const mariana = conArticulo.items.find((p) => p.universidad === 'Universidad Mariana')
    expect(mariana?.estado).toBe('conflicto')
    const sinContexto = sinArticulo.items.find((p) => p.universidad === 'Universidad Mariana')
    expect(sinContexto?.estado).toBe('disponible')
  })

  it('registers a peer with the data-treatment authorization date, and refuses a repeated email', async () => {
    const cuerpo = {
      nombre: 'Marta Lucía Gómez',
      correo: 'ml.gomez@udenar.edu.co',
      universidad: 'Universidad de Nariño',
      area: 'Educación rural',
      autorizoDatos: true,
    }
    const r = await llamar('/reep/pares', { metodo: 'POST', cuerpo, usuario: AUXILIAR })
    expect(r.status).toBe(201)
    const par = await json<ParDetalle>(r)
    expect(par.autorizoDatosEn).not.toBeNull()
    expect((await llamar('/reep/pares', { metodo: 'POST', cuerpo })).status).toBe(409)

    // The new peer exists only in this journal
    const enIre = await json<ListaPares>(await llamar('/ire/pares?estado=todos&q=gomez'))
    expect(enIre.items.some((p) => p.correo === cuerpo.correo)).toBe(false)
  })

  it('shows the peer record: delivered evaluations, unanswered invitations and participations', async () => {
    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-1'))
    expect(par.nombre).toBe('Luz Marina Burbano')
    expect(par.evaluacionesEntregadas).toBeGreaterThan(0)
    expect(par.participaciones.length).toBeGreaterThan(0)
    expect(par.participaciones.every((x) => x.numeroOjs && x.titulo)).toBe(true)
    expect((await llamar('/ire/pares/reep-par-1')).status).toBe(404)
  })

  it('unblocking needs a reason; the Auxiliar can block and unblock', async () => {
    const id = 'reep-par-5'
    expect(
      (await llamar(`/reep/pares/${id}/desbloquear`, { metodo: 'POST', cuerpo: { motivo: ' ' } }))
        .status,
    ).toBe(422)
    const ok = await llamar(`/reep/pares/${id}/desbloquear`, {
      metodo: 'POST',
      usuario: AUXILIAR,
      cuerpo: { motivo: 'Manifestó interés en volver a participar.' },
    })
    expect(ok.status).toBe(200)
    expect((await json<ParDetalle>(ok)).bloqueo).toBeNull()

    const bloq = await llamar(`/reep/pares/${id}/bloquear`, {
      metodo: 'POST',
      cuerpo: { motivo: 'no-desea' },
    })
    expect((await json<ParDetalle>(bloq)).bloqueo?.motivo).toBe('no-desea')
  })
})

describe('assignment and invitation (mock)', () => {
  it('only an article approved by the committee (most recent round) receives peers', async () => {
    const articulo = await articuloNuevo('reep', '2026-035', 'reep-au-3', false)
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    expect((await asignar('reep', articulo.id, par.id)).status).toBe(409)
    await ronda('reep', articulo.id, 'ajustes')
    expect((await asignar('reep', articulo.id, par.id)).status).toBe(409)
    await ronda('reep', articulo.id, 'aprobado')
    expect((await asignar('reep', articulo.id, par.id)).status).toBe(201)
  })

  it('lists as available only peers not blocked, without evaluations in progress and not in the article', async () => {
    const articulo = await articuloNuevo('reep', '2026-036', 'reep-au-3')
    const antes = await disponibles('reep', articulo.id)
    expect(antes.length).toBeGreaterThan(0)
    expect(antes.some((p) => p.estado === 'bloqueado')).toBe(false)
    const ocupados = await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-012'))
    const enCurso = ocupados.asignaciones
      .filter((a) => ['invitado', 'segundo-intento', 'acepto'].includes(a.estado))
      .map((a) => a.par.id)
    expect(enCurso.length).toBeGreaterThan(0)
    expect(antes.some((p) => enCurso.includes(p.id))).toBe(false)

    const elegido = antes[0] as ParListado
    await asignar('reep', articulo.id, elegido.id)
    const despues = await disponibles('reep', articulo.id)
    expect(despues.some((p) => p.id === elegido.id)).toBe(false)
  })

  it('assigning sends the invitation by itself; the article is «En evaluación» once a peer accepts', async () => {
    const articulo = await articuloNuevo('reep', '2026-037', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await asignar('reep', articulo.id, par.id, AUXILIAR)
    expect(r.status).toBe(201)
    const cuerpo = await json<ResultadoAsignacion>(r)
    expect(cuerpo.asignacion).toMatchObject({ orden: 1, estado: 'invitado', intento: 1 })
    expect(cuerpo.correo).toEqual({ estado: 'entregado', destinatario: par.correo })

    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${articulo.id}/historial`),
    )
    expect(h.correos[0]).toMatchObject({ tipo: 'invitacion', destinatario: par.correo })
    expect(
      h.auditoria.some((a) => a.accion === 'Asignó el par 1' && a.usuario === 'Andrea Villota'),
    ).toBe(true)

    const enRevision = await json<ArticuloDetalle>(await llamar(`/reep/articulos/${articulo.id}`))
    expect(enRevision.estado).toBe('en-revision')
    await responder(cuerpo.asignacion.id, 'acepto')
    const enEvaluacion = await json<ArticuloDetalle>(await llamar(`/reep/articulos/${articulo.id}`))
    expect(enEvaluacion.estado).toBe('en-evaluacion')
  })

  it('a new candidate is saved in the journal base and invited right away', async () => {
    const articulo = await articuloNuevo('reep', '2026-038', 'reep-au-3')
    const nuevo = {
      nombre: 'Marta Lucía Gómez',
      correo: 'ML.Gomez@udenar.edu.co',
      universidad: 'Universidad de Nariño',
      area: 'Educación rural',
    }
    const r = await llamar(`/reep/articulos/${articulo.id}/asignaciones`, {
      metodo: 'POST',
      cuerpo: { nuevo },
      usuario: AUXILIAR,
    })
    expect(r.status).toBe(201)
    const cuerpo = await json<ResultadoAsignacion>(r)
    expect(cuerpo.par).toMatchObject({
      nombre: 'Marta Lucía Gómez',
      correo: 'ml.gomez@udenar.edu.co',
    })
    expect(cuerpo.correo.estado).toBe('entregado')
    const base = await json<ListaPares>(await llamar('/reep/pares?estado=todos&q=gomez'))
    expect(base.items.map((p) => p.correo)).toContain('ml.gomez@udenar.edu.co')
    const enIre = await json<ListaPares>(await llamar('/ire/pares?estado=todos&q=gomez'))
    expect(enIre.total).toBe(0)

    const repetido = await llamar(`/reep/articulos/${articulo.id}/asignaciones`, {
      metodo: 'POST',
      cuerpo: { nuevo },
    })
    expect(repetido.status).toBe(409)
    const invalido = await llamar(`/reep/articulos/${articulo.id}/asignaciones`, {
      metodo: 'POST',
      cuerpo: { nuevo: { ...nuevo, correo: 'sin-arroba' } },
    })
    expect(invalido.status).toBe(422)
  })

  it('warns about a conflict of interest without blocking the assignment', async () => {
    const articulo = await articuloNuevo('reep', '2026-039', 'reep-au-2') // author from Universidad CESMAG
    const conflicto = (await disponibles('reep', articulo.id)).find((p) => p.estado === 'conflicto')
    if (!conflicto) throw new Error('no peer in conflict')
    const r = await asignar('reep', articulo.id, conflicto.id)
    expect(r.status).toBe(201)
    expect((await json<ResultadoAsignacion>(r)).conflicto?.mensaje).toBeTruthy()
  })

  it('refuses blocked peers, repeated peers and peers busy with another evaluation', async () => {
    const articulo = await articuloNuevo('reep', '2026-040', 'reep-au-3')
    const otro = await articuloNuevo('reep', '2026-041', 'reep-au-3')
    expect((await asignar('reep', articulo.id, 'reep-par-5')).status).toBe(409) // blocked
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    expect((await asignar('reep', articulo.id, par.id)).status).toBe(201)
    expect((await asignar('reep', articulo.id, par.id)).status).toBe(409) // repeated
    expect((await asignar('reep', otro.id, par.id)).status).toBe(409) // evaluation in progress
  })

  it('at most three peers who accepted or delivered; declines and missing answers take no place', async () => {
    const articulo = await articuloNuevo('reep', '2026-042', 'reep-au-3')
    // Five invitations in parallel: an invitation does not take a place
    const asignados: ResultadoAsignacion[] = []
    for (const n of [1, 2, 3, 4, 5]) asignados.push(await candidato(articulo.id, n))
    const [a, b, c, d, e] = asignados.map((x) => x.asignacion.id) as [
      string,
      string,
      string,
      string,
      string,
    ]
    // One does not accept this invitation: not blocked, no place taken
    await responder(a, 'no-acepto')
    const primero = await json<ParDetalle>(
      await llamar(`/reep/pares/${asignados[0]?.par.id ?? ''}`),
    )
    expect(primero.bloqueo).toBeNull()
    // Three accept: the article is full
    for (const id of [b, c, d]) expect((await responder(id, 'acepto')).status).toBe(200)
    expect((await responder(e, 'acepto')).status).toBe(409)
    const [libre] = await disponibles('reep', articulo.id)
    expect((await asignar('reep', articulo.id, libre?.id ?? '')).status).toBe(409)
  })

  it('a peer of the other journal cannot be assigned', async () => {
    const articulo = await articuloNuevo('reep', '2026-043', 'reep-au-3')
    expect((await asignar('reep', articulo.id, 'ire-par-1')).status).toBe(404)
  })

  it('a bounced address keeps the assignment so it can be fixed and resent (RF-27)', async () => {
    const articulo = await articuloNuevo('reep', '2026-044', 'reep-au-3')
    const r = await json<ResultadoAsignacion>(
      await llamar(`/reep/articulos/${articulo.id}/asignaciones`, {
        metodo: 'POST',
        cuerpo: {
          nuevo: {
            nombre: 'Par Rebote',
            correo: 'par@invalido.test',
            universidad: 'Universidad del Valle',
            area: 'Educación rural',
          },
        },
      }),
    )
    expect(r.correo.estado).toBe('rebotado')
    expect(r.asignacion.estado).toBe('invitado')

    await llamar(`/reep/pares/${r.par.id}`, {
      metodo: 'PATCH',
      cuerpo: { correo: 'par.corregido@univalle.edu.co' },
    })
    const reenvio = await json<ResultadoAsignacion>(
      await llamar(`/reep/asignaciones/${r.asignacion.id}/reenviar`, {
        metodo: 'POST',
        cuerpo: { tipo: 'reenvio' },
      }),
    )
    expect(reenvio.correo.estado).toBe('entregado')
    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${articulo.id}/historial`),
    )
    expect(h.correos.map((x) => x.estado)).toEqual(
      expect.arrayContaining(['rebotado', 'entregado']),
    )
  })

  it('resending moves to 2nd attempt; a missing answer after it leaves «Sin respuesta» and blocks', async () => {
    const articulo = await articuloNuevo('reep', '2026-045', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par.id))
    const id = r.asignacion.id

    expect((await responder(id, 'sin-respuesta')).status).toBe(409) // only after the 2nd attempt
    const reenvio = await json<ResultadoAsignacion>(
      await llamar(`/reep/asignaciones/${id}/reenviar`, {
        metodo: 'POST',
        cuerpo: { tipo: 'reenvio' },
      }),
    )
    expect(reenvio.asignacion).toMatchObject({ estado: 'segundo-intento', intento: 2 })
    const sin = await responder(id, 'sin-respuesta')
    expect((await json<{ estado: string }>(sin)).estado).toBe('sin-respuesta')
    const ficha = await json<ParDetalle>(await llamar(`/reep/pares/${par.id}`))
    expect(ficha.bloqueo?.motivo).toBe('sin-respuesta')
    const otro = await articuloNuevo('reep', '2026-046', 'reep-au-3')
    expect((await asignar('reep', otro.id, par.id)).status).toBe(409)
  })

  it('«No desea participar más» blocks the peer as "no desea participar"', async () => {
    const articulo = await articuloNuevo('reep', '2026-047', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par.id))
    await responder(r.asignacion.id, 'no-desea')
    const ficha = await json<ParDetalle>(await llamar(`/reep/pares/${par.id}`))
    expect(ficha.bloqueo?.motivo).toBe('no-desea')
  })

  it('delivery needs acceptance, creates a pending constancia and enables the concept', async () => {
    const articulo = await articuloNuevo('reep', '2026-048', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par.id))
    const id = r.asignacion.id
    const entrega = (fecha: string) =>
      llamar(`/reep/asignaciones/${id}/entrega`, { metodo: 'POST', cuerpo: { fecha } })
    const concepto = (c: string) =>
      llamar(`/reep/asignaciones/${id}/concepto`, { metodo: 'POST', cuerpo: { concepto: c } })

    expect((await entrega(hoy())).status).toBe(409) // not accepted yet
    await responder(id, 'acepto')
    expect((await entrega('2099-01-01')).status).toBe(422) // future
    expect((await concepto('publicable')).status).toBe(409)
    expect((await entrega(hoy())).status).toBe(200)
    expect((await concepto('pendiente-formato')).status).toBe(200)
    expect((await concepto('publicable')).status).toBe(200) // corrected

    const ficha = await json<ParDetalle>(await llamar(`/reep/pares/${par.id}`))
    expect(ficha.participaciones.find((x) => x.asignacionId === id)).toMatchObject({
      estado: 'entrego',
      concepto: 'publicable',
      constancia: 'pendiente',
    })
  })

  it('the third peer is the tiebreaker only when the first two concepts contradict', async () => {
    async function entregar(id: string, concepto: 'publicable' | 'no-publicable') {
      await responder(id, 'acepto')
      await llamar(`/reep/asignaciones/${id}/entrega`, {
        metodo: 'POST',
        cuerpo: { fecha: hoy() },
      })
      await llamar(`/reep/asignaciones/${id}/concepto`, { metodo: 'POST', cuerpo: { concepto } })
    }
    async function tresPares(numero: string, segundo: 'publicable' | 'no-publicable') {
      const articulo = await articuloNuevo('reep', numero, 'reep-au-3')
      const a1 = await candidato(articulo.id, 1)
      const a2 = await candidato(articulo.id, 2)
      await entregar(a1.asignacion.id, 'publicable')
      await entregar(a2.asignacion.id, segundo)
      return candidato(articulo.id, 3)
    }
    expect((await tresPares('2026-049', 'publicable')).asignacion.esDesempate).toBe(false)
    expect((await tresPares('2026-050', 'no-publicable')).asignacion.esDesempate).toBe(true)
  })

  it('a reminder is queued, not sent now (simulated)', async () => {
    const articulo = await articuloNuevo('reep', '2026-051', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par.id))
    const rec = await json<ResultadoAsignacion>(
      await llamar(`/reep/asignaciones/${r.asignacion.id}/reenviar`, {
        metodo: 'POST',
        cuerpo: { tipo: 'recordatorio' },
      }),
    )
    expect(rec.correo.estado).toBe('en-cola')
    expect(rec.asignacion.estado).toBe('invitado')
  })
})
