import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { ArticuloDetalle } from '@/types/articulo'
import type { HistorialArticulo } from '@/types/historial'
import type { ParDetalle, ParListado, ResultadoAsignacion } from '@/types/par'

/** Hoy como aaaa-mm-dd (una invitación lleva la fecha de ahora, así que una entrega no puede ser anterior). */
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

/** Un artículo nuevo; por defecto el comité lo aprueba para que pueda recibir pares. */
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
  if (aprobado) await ronda(revista, articulo.id)
  return articulo
}

/** Una ronda del comité con el resultado que el comité elige (aprobada por defecto). */
function ronda(revista: 'reep' | 'ire', id: string, resultado = 'aprobado') {
  return llamar(`/${revista}/articulos/${id}/rondas`, {
    metodo: 'POST',
    cuerpo: { coincidencias: 6, atribuidoIa: 2, resultado, observacion: '' },
  })
}

/** Pares que se pueden asignar al artículo: no bloqueados y sin evaluación en curso. */
async function disponibles(revista: 'reep' | 'ire', articuloId: string): Promise<ParListado[]> {
  const r = await llamar(`/${revista}/pares?estado=asignables&articulo=${articuloId}&porPagina=50`)
  return (await json<ListaPares>(r)).items
}

/** Asigna un candidato nuevo (se guarda en la base y se invita); los datos de ejemplo tienen pocos pares libres. */
async function candidato(articuloId: string, n: number): Promise<ResultadoAsignacion> {
  const r = await llamar(`/reep/articulos/${articuloId}/asignaciones`, {
    metodo: 'POST',
    cuerpo: {
      nuevo: {
        nombre: `Candidato ${n} del artículo ${articuloId}`,
        profesion: 'Magíster en Educación',
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
  it('the base of peers is common to both journals, with the same thematic areas', async () => {
    const reep = await json<ListaPares>(await llamar('/reep/pares?estado=todos&porPagina=50'))
    const ire = await json<ListaPares>(await llamar('/ire/pares?estado=todos&porPagina=50'))
    expect(reep.totalBase).toBe(30)
    expect(ire.totalBase).toBe(30)
    expect(reep.items.map((p) => p.id).sort()).toEqual(ire.items.map((p) => p.id).sort())

    const areasReep = await json<string[]>(await llamar('/reep/pares/areas'))
    const areasIre = await json<string[]>(await llamar('/ire/pares/areas'))
    expect(areasReep).toEqual(areasIre)
    expect(areasReep).toContain('Educación inclusiva')
    expect(areasReep).toContain('Memoria y conflicto')
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
    expect(bloqueados.total).toBe(8)
    expect(bloqueados.items.every((p) => p.bloqueo !== null && p.estado === 'bloqueado')).toBe(true)
  })

  it('marks «Misma institución» with the article authors and does not offer those peers', async () => {
    const sinArticulo = await json<ListaPares>(await llamar('/reep/pares?porPagina=50'))

    // 2026-034 tiene un autor de la Universidad Mariana: allí no se puede asignar un par de Mariana.
    const conArticulo = await json<ListaPares>(
      await llamar('/reep/pares?porPagina=50&articulo=2026-034'),
    )
    const mariana = conArticulo.items.find((p) => p.universidad === 'Universidad Mariana')
    expect(mariana?.estado).toBe('misma-institucion')
    const sinContexto = sinArticulo.items.find((p) => p.universidad === 'Universidad Mariana')
    expect(sinContexto?.estado).toBe('disponible')
    // ... y no se ofrece entre los pares que se pueden asignar.
    const asignables = await json<ListaPares>(
      await llamar('/reep/pares?estado=asignables&porPagina=50&articulo=2026-034'),
    )
    expect(asignables.items.some((p) => p.universidad === 'Universidad Mariana')).toBe(false)
  })

  it('registers a peer with its profession, and refuses a repeated email', async () => {
    const cuerpo = {
      nombre: 'Marta Lucía Gómez',
      correo: 'ml.gomez@udenar.edu.co',
      universidad: 'Universidad de Nariño',
      area: 'Educación rural',
      profesion: 'Magíster en Educación',
    }
    const r = await llamar('/reep/pares', { metodo: 'POST', cuerpo, usuario: AUXILIAR })
    expect(r.status).toBe(201)
    const par = await json<ParDetalle>(r)
    expect(par.profesion).toBe('Magíster en Educación')
    expect((await llamar('/reep/pares', { metodo: 'POST', cuerpo })).status).toBe(409)

    // La base es común: el par nuevo también está en la otra revista
    const enIre = await json<ListaPares>(await llamar('/ire/pares?estado=todos&q=gomez'))
    expect(enIre.items.some((p) => p.correo === cuerpo.correo)).toBe(true)
  })

  it('shows the peer record: delivered evaluations, unanswered invitations and participations', async () => {
    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-1'))
    expect(par.nombre).toBe('Luz Marina Burbano')
    expect(par.evaluacionesEntregadas).toBeGreaterThan(0)
    expect(par.participaciones.length).toBeGreaterThan(0)
    expect(par.participaciones.every((x) => x.numeroOjs && x.titulo)).toBe(true)
    // la misma ficha se abre desde la otra revista, con la revista de cada participación
    expect((await llamar('/ire/pares/reep-par-1')).status).toBe(200)
    expect(par.participaciones.every((x) => x.revista === 'reep' || x.revista === 'ire')).toBe(true)
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

describe('the base of peers is common', () => {
  it('a repeated email is refused in either journal; there is no «other journal» lookup any more', async () => {
    const ire = await json<ListaPares>(await llamar('/ire/pares?estado=bloqueados&porPagina=50'))
    const existente = ire.items[0]
    if (!existente) throw new Error('seed missing')
    const r = await llamar('/reep/pares', {
      metodo: 'POST',
      cuerpo: {
        nombre: 'Otro nombre',
        correo: existente.correo.toUpperCase(),
        universidad: 'U',
        area: 'A',
      },
    })
    expect(r.status).toBe(409)
    expect((await llamar('/reep/pares/en-otra-revista?correo=nadie@x.co')).status).toBe(404)
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
    await ronda('reep', articulo.id)
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
    expect(cuerpo.correo).toEqual({ estado: 'enviado', destinatario: par.correo })

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

  it('the invitation carries the request number, the profession and the university', async () => {
    await llamar('/plantillas/reep-invitacion', {
      metodo: 'PUT',
      cuerpo: {
        asunto: 'Solicitud {{numero}} · {{revista}}',
        cuerpo: '{{par}}, {{profesion}} ({{universidad}}): evalúe «{{articulo}}».',
      },
    })
    const articulo = await articuloNuevo('reep', '2026-052', 'reep-au-3')
    await candidato(articulo.id, 9)
    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${articulo.id}/historial`),
    )
    expect(h.correos[0]?.asunto).toBe(
      'Solicitud 2026-052 · Revista Electrónica en Educación y Pedagogía',
    )
  })

  it('a new candidate is saved in the common base and invited right away', async () => {
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
    expect(cuerpo.correo.estado).toBe('enviado')
    const base = await json<ListaPares>(await llamar('/reep/pares?estado=todos&q=gomez'))
    expect(base.items.map((p) => p.correo)).toContain('ml.gomez@udenar.edu.co')
    const enIre = await json<ListaPares>(await llamar('/ire/pares?estado=todos&q=gomez'))
    expect(enIre.total).toBe(1)

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

  it('refuses a peer of the same institution as an author and leaves a new candidate unregistered', async () => {
    const articulo = await articuloNuevo('reep', '2026-039', 'reep-au-2') // author from Universidad CESMAG
    const nuevo = {
      nombre: 'Par Cesmag',
      correo: 'par.cesmag@unicesmag.edu.co',
      universidad: 'universidad cesmag',
      area: 'Educación',
    }
    const r = await llamar(`/reep/articulos/${articulo.id}/asignaciones`, { metodo: 'POST', cuerpo: { nuevo } })
    expect(r.status).toBe(409)
    expect((await json<{ mensaje: string }>(r)).mensaje).toContain('misma institución')
    const base = await json<ListaPares>(await llamar('/reep/pares?estado=todos&q=par%20cesmag'))
    expect(base.total).toBe(0)
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

  it('with two peers no more are searched; a declined invitation frees its place', async () => {
    const articulo = await articuloNuevo('reep', '2026-042', 'reep-au-3')
    const a = await candidato(articulo.id, 1)
    const b = await candidato(articulo.id, 2)
    // Dos pares (invitados): el artículo no toma un tercero
    const tercero = await llamar(`/reep/articulos/${articulo.id}/asignaciones`, {
      metodo: 'POST',
      cuerpo: { nuevo: { nombre: 'Tercero', correo: 'tercero.42@x.co', universidad: 'Universidad X', area: 'A' } },
    })
    expect(tercero.status).toBe(409)
    expect((await json<{ mensaje: string }>(tercero)).mensaje).toContain('2 pares evaluadores')

    // Uno no acepta esta invitación: no se bloquea y su lugar queda libre otra vez
    await responder(a.asignacion.id, 'no-acepto')
    const primero = await json<ParDetalle>(await llamar(`/reep/pares/${a.par.id}`))
    expect(primero.bloqueo).toBeNull()
    expect((await candidato(articulo.id, 3)).asignacion.estado).toBe('invitado')
    expect((await responder(b.asignacion.id, 'acepto')).status).toBe(200)
  })

  it('a peer can be assigned to an article of either journal (common base)', async () => {
    const articulo = await articuloNuevo('reep', '2026-043', 'reep-au-3')
    const r = await asignar('reep', articulo.id, 'ire-par-1')
    expect([201, 409]).toContain(r.status) // 409 only if that peer is busy or blocked, never 404
    expect(r.status).not.toBe(404)
  })

  it('a bounced address keeps the assignment so it can be fixed and resent', async () => {
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
      await llamar(`/reep/asignaciones/${r.asignacion.id}/reenviar`, { metodo: 'POST' }),
    )
    expect(reenvio.correo.estado).toBe('enviado')
    // El reenvío tras una corrección no es un intento nuevo, y se permite solo una vez
    expect(reenvio.asignacion.intento).toBe(r.asignacion.intento)
    expect(
      (await llamar(`/reep/asignaciones/${r.asignacion.id}/reenviar`, { metodo: 'POST' })).status,
    ).toBe(409)
    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${articulo.id}/historial`),
    )
    expect(h.correos.map((x) => x.estado)).toEqual(expect.arrayContaining(['rebotado', 'enviado']))
  })

  it('the invitation cannot be resent by hand unless the send bounced or failed', async () => {
    const articulo = await articuloNuevo('reep', '2026-045', 'reep-au-3')
    const [par] = await disponibles('reep', articulo.id)
    if (!par) throw new Error('no available peer')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par.id))
    const reenvio = await llamar(`/reep/asignaciones/${r.asignacion.id}/reenviar`, {
      metodo: 'POST',
    })
    expect(reenvio.status).toBe(409)
    // «Sin respuesta» solo después del segundo intento (automático)
    expect((await responder(r.asignacion.id, 'sin-respuesta')).status).toBe(409)
  })

  it('a missing answer after the 2nd attempt leaves «Sin respuesta» and blocks the peer', async () => {
    const ficha = await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-012'))
    const segundo = ficha.asignaciones.find((a) => a.estado === 'segundo-intento')
    if (!segundo) throw new Error('seed missing a 2nd attempt')
    const sin = await responder(segundo.id, 'sin-respuesta')
    expect((await json<{ estado: string }>(sin)).estado).toBe('sin-respuesta')
    const par = await json<ParDetalle>(await llamar(`/reep/pares/${segundo.par.id}`))
    expect(par.bloqueo?.motivo).toBe('sin-respuesta')
    const otro = await articuloNuevo('reep', '2026-046', 'reep-au-3')
    expect((await asignar('reep', otro.id, segundo.par.id)).status).toBe(409)
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

  it('the third peer is allowed, as tiebreaker, only when the two concepts do not coincide', async () => {
    async function entregar(id: string, concepto: 'publicable' | 'no-publicable') {
      await responder(id, 'acepto')
      await llamar(`/reep/asignaciones/${id}/entrega`, {
        metodo: 'POST',
        cuerpo: { fecha: hoy() },
      })
      await llamar(`/reep/asignaciones/${id}/concepto`, { metodo: 'POST', cuerpo: { concepto } })
    }
    async function dosPares(numero: string, segundo: 'publicable' | 'no-publicable') {
      const articulo = await articuloNuevo('reep', numero, 'reep-au-3')
      const a1 = await candidato(articulo.id, 1)
      const a2 = await candidato(articulo.id, 2)
      await entregar(a1.asignacion.id, 'publicable')
      await entregar(a2.asignacion.id, segundo)
      return articulo
    }
    const nuevoPar = (id: string) =>
      llamar(`/reep/articulos/${id}/asignaciones`, {
        metodo: 'POST',
        cuerpo: { nuevo: { nombre: 'Tercero', correo: `tercero.${id}@x.co`, universidad: 'Universidad X', area: 'A' } },
      })
    const coinciden = await dosPares('2026-049', 'publicable')
    expect((await nuevoPar(coinciden.id)).status).toBe(409)
    const difieren = await dosPares('2026-050', 'no-publicable')
    const tercero = await nuevoPar(difieren.id)
    expect(tercero.status).toBe(201)
    expect((await json<ResultadoAsignacion>(tercero)).asignacion.esDesempate).toBe(true)
  })
})
