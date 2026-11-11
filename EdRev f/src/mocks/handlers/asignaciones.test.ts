import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { ArticuloDetalle } from '@/types/articulo'
import type { HistorialArticulo } from '@/types/historial'
import type {
  ParDetalle,
  ParListado,
  ResultadoAsignacion,
  VistaPreviaInvitacion,
} from '@/types/par'

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

async function articuloNuevo(revista: 'reep' | 'ire', numero: string, autorId: string) {
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
  return json<ArticuloDetalle>(r)
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
  it('previews the invitation with the journal sender, fixed template and no attachments', async () => {
    const articulo = await articuloNuevo('reep', '2026-035', 'reep-au-3')
    const v = await json<VistaPreviaInvitacion>(
      await llamar(`/reep/articulos/${articulo.id}/asignaciones/vista-previa?parId=reep-par-1`),
    )
    expect(v.de).toBe('editorial.eyp@gmail.com')
    expect(v.para).toBe('lm.burbano@udenar.edu.co')
    expect(v.asunto).toBe(
      'Invitación a evaluar un artículo · Revista Electrónica en Educación y Pedagogía',
    )
    expect(v.cuerpo).toContain('Apreciado(a) Luz Marina Burbano')
    expect(v.cuerpo).toContain('«Artículo 2026-035»')
    expect(v.adjuntos).toMatch(/Sin adjuntos/)
    expect(v.orden).toBe(1)
    expect(v.conflicto).toBeNull()
  })

  it('warns about a conflict of interest without blocking the assignment', async () => {
    const articulo = await articuloNuevo('reep', '2026-036', 'reep-au-2') // author from Universidad CESMAG
    const v = await json<VistaPreviaInvitacion>(
      await llamar(`/reep/articulos/${articulo.id}/asignaciones/vista-previa?parId=reep-par-4`),
    )
    expect(v.conflicto?.mensaje).toContain('Diego Fernando Erazo')
    expect((await asignar('reep', articulo.id, 'reep-par-4')).status).toBe(201)
  })

  it('assigning sends the invitation by itself and leaves a trace in the history', async () => {
    const articulo = await articuloNuevo('reep', '2026-037', 'reep-au-3')
    const r = await asignar('reep', articulo.id, 'reep-par-1', AUXILIAR)
    expect(r.status).toBe(201)
    const cuerpo = await json<ResultadoAsignacion>(r)
    expect(cuerpo.asignacion).toMatchObject({ orden: 1, estado: 'invitado', intento: 1 })
    expect(cuerpo.correo).toEqual({ estado: 'entregado', destinatario: 'lm.burbano@udenar.edu.co' })

    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${articulo.id}/historial`),
    )
    expect(h.correos[0]).toMatchObject({
      tipo: 'invitacion',
      destinatario: 'lm.burbano@udenar.edu.co',
      estado: 'entregado',
    })
    expect(
      h.auditoria.some((a) => a.accion === 'Asignó el par 1' && a.usuario === 'Andrea Villota'),
    ).toBe(true)

    const art = await json<ArticuloDetalle>(await llamar(`/reep/articulos/${articulo.id}`))
    expect(art.estado).toBe('en-evaluacion')
    expect(art.asignaciones).toHaveLength(1)
  })

  it('refuses blocked peers, repeated peers and a fourth peer', async () => {
    const articulo = await articuloNuevo('reep', '2026-038', 'reep-au-3')
    expect((await asignar('reep', articulo.id, 'reep-par-5')).status).toBe(409) // blocked
    expect((await asignar('reep', articulo.id, 'reep-par-1')).status).toBe(201)
    expect((await asignar('reep', articulo.id, 'reep-par-1')).status).toBe(409) // repeated
    expect((await asignar('reep', articulo.id, 'reep-par-2')).status).toBe(201)
    expect((await asignar('reep', articulo.id, 'reep-par-3')).status).toBe(201)
    expect((await asignar('reep', articulo.id, 'reep-par-6')).status).toBe(409) // fourth
  })

  it('invitations run in parallel: one accepts and goes on, a decline frees its place', async () => {
    const articulo = await articuloNuevo('reep', '2026-045', 'reep-au-3')
    const ids: string[] = []
    for (const par of ['reep-par-1', 'reep-par-2', 'reep-par-3']) {
      const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, par))
      ids.push(r.asignacion.id)
    }
    const [primero, segundo] = ids
    // The first accepts and its evaluation goes on while the others are still pending
    await llamar(`/reep/asignaciones/${primero}/respuesta`, {
      metodo: 'POST',
      cuerpo: { respuesta: 'acepto' },
    })
    const entrega = await llamar(`/reep/asignaciones/${primero}/entrega`, {
      metodo: 'POST',
      cuerpo: { fecha: hoy() },
    })
    expect(entrega.status).toBe(200)
    // Three in force: no room for a fourth
    expect((await asignar('reep', articulo.id, 'reep-par-6')).status).toBe(409)
    // The second declines: it stays listed but frees its place for another peer
    await llamar(`/reep/asignaciones/${segundo}/respuesta`, {
      metodo: 'POST',
      cuerpo: { respuesta: 'no-acepto' },
    })
    const otro = await asignar('reep', articulo.id, 'reep-par-6')
    expect(otro.status).toBe(201)
    expect((await json<ResultadoAsignacion>(otro)).asignacion.orden).toBe(4)
    const ficha = await json<ArticuloDetalle>(await llamar(`/reep/articulos/${articulo.id}`))
    expect(ficha.asignaciones).toHaveLength(4)
  })

  it('a peer of the other journal cannot be assigned', async () => {
    const articulo = await articuloNuevo('reep', '2026-039', 'reep-au-3')
    expect((await asignar('reep', articulo.id, 'ire-par-1')).status).toBe(404)
  })

  it('a bounced address keeps the assignment so it can be fixed and resent (RF-27)', async () => {
    const articulo = await articuloNuevo('reep', '2026-040', 'reep-au-3')
    const creado = await json<ParDetalle>(
      await llamar('/reep/pares', {
        metodo: 'POST',
        cuerpo: {
          nombre: 'Par Rebote',
          correo: 'par@invalido.test',
          universidad: 'Universidad del Valle',
          area: 'Educación rural',
          autorizoDatos: false,
        },
      }),
    )
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, creado.id))
    expect(r.correo.estado).toBe('rebotado')
    expect(r.asignacion.estado).toBe('invitado')

    // Correct the address and resend: it is delivered now
    await llamar(`/reep/pares/${creado.id}`, {
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
    expect(h.correos.map((c) => c.estado)).toEqual(
      expect.arrayContaining(['rebotado', 'entregado']),
    )
  })

  it('resending moves to 2nd attempt; a missing answer after it blocks the peer; accepting does not', async () => {
    const articulo = await articuloNuevo('reep', '2026-041', 'reep-au-3')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, 'reep-par-1'))
    const id = r.asignacion.id

    // "no response" is only valid after the second attempt
    expect(
      (
        await llamar(`/reep/asignaciones/${id}/respuesta`, {
          metodo: 'POST',
          cuerpo: { respuesta: 'sin-respuesta' },
        })
      ).status,
    ).toBe(409)

    const reenvio = await json<ResultadoAsignacion>(
      await llamar(`/reep/asignaciones/${id}/reenviar`, {
        metodo: 'POST',
        cuerpo: { tipo: 'reenvio' },
      }),
    )
    expect(reenvio.asignacion).toMatchObject({ estado: 'segundo-intento', intento: 2 })

    expect(
      (
        await llamar(`/reep/asignaciones/${id}/respuesta`, {
          metodo: 'POST',
          cuerpo: { respuesta: 'sin-respuesta' },
        })
      ).status,
    ).toBe(200)
    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-1'))
    expect(par.bloqueo?.motivo).toBe('sin-respuesta')
    // A blocked peer gets no new invitations
    const otro = await articuloNuevo('reep', '2026-042', 'reep-au-3')
    expect((await asignar('reep', otro.id, 'reep-par-1')).status).toBe(409)
  })

  it('a peer who declines goes to the blocked list as "no desea participar"', async () => {
    const articulo = await articuloNuevo('reep', '2026-043', 'reep-au-3')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, 'reep-par-6'))
    await llamar(`/reep/asignaciones/${r.asignacion.id}/respuesta`, {
      metodo: 'POST',
      cuerpo: { respuesta: 'no-acepto' },
    })
    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-6'))
    expect(par.bloqueo?.motivo).toBe('no-desea')
  })

  it('delivery needs acceptance, creates a pending constancia and enables the concept', async () => {
    const articulo = await articuloNuevo('reep', '2026-044', 'reep-au-3')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, 'reep-par-2'))
    const id = r.asignacion.id
    const entrega = (fecha: string, usuario?: typeof AUXILIAR) =>
      llamar(`/reep/asignaciones/${id}/entrega`, { metodo: 'POST', cuerpo: { fecha }, usuario })

    expect((await entrega(hoy())).status).toBe(409) // not accepted yet
    await llamar(`/reep/asignaciones/${id}/respuesta`, {
      metodo: 'POST',
      cuerpo: { respuesta: 'acepto' },
    })
    expect((await entrega('2099-01-01')).status).toBe(422) // future
    expect(
      (
        await llamar(`/reep/asignaciones/${id}/concepto`, {
          metodo: 'POST',
          cuerpo: { concepto: 'publicable' },
        })
      ).status,
    ).toBe(409)

    expect((await entrega(hoy())).status).toBe(200)
    expect(
      (
        await llamar(`/reep/asignaciones/${id}/concepto`, {
          metodo: 'POST',
          cuerpo: { concepto: 'publicable' },
        })
      ).status,
    ).toBe(200)

    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-2'))
    const part = par.participaciones.find((x) => x.asignacionId === id)
    expect(part).toMatchObject({
      estado: 'entrego',
      concepto: 'publicable',
      constancia: 'pendiente',
    })
  })

  it('the third peer is the tiebreaker only when the first two concepts contradict', async () => {
    async function entregar(
      revistaArt: string,
      id: string,
      concepto: 'publicable' | 'no-publicable',
    ) {
      await llamar(`/reep/asignaciones/${id}/respuesta`, {
        metodo: 'POST',
        cuerpo: { respuesta: 'acepto' },
      })
      await llamar(`/reep/asignaciones/${id}/entrega`, {
        metodo: 'POST',
        cuerpo: { fecha: hoy() },
      })
      await llamar(`/reep/asignaciones/${id}/concepto`, { metodo: 'POST', cuerpo: { concepto } })
      return revistaArt
    }

    const coinciden = await articuloNuevo('reep', '2026-045', 'reep-au-3')
    const a1 = await json<ResultadoAsignacion>(await asignar('reep', coinciden.id, 'reep-par-1'))
    const a2 = await json<ResultadoAsignacion>(await asignar('reep', coinciden.id, 'reep-par-2'))
    await entregar(coinciden.id, a1.asignacion.id, 'publicable')
    await entregar(coinciden.id, a2.asignacion.id, 'publicable')
    const v1 = await json<VistaPreviaInvitacion>(
      await llamar(`/reep/articulos/${coinciden.id}/asignaciones/vista-previa?parId=reep-par-3`),
    )
    expect(v1).toMatchObject({ orden: 3, esDesempate: false })

    const divergen = await articuloNuevo('reep', '2026-046', 'reep-au-3')
    const b1 = await json<ResultadoAsignacion>(await asignar('reep', divergen.id, 'reep-par-1'))
    const b2 = await json<ResultadoAsignacion>(await asignar('reep', divergen.id, 'reep-par-2'))
    await entregar(divergen.id, b1.asignacion.id, 'publicable')
    await entregar(divergen.id, b2.asignacion.id, 'no-publicable')
    const v2 = await json<VistaPreviaInvitacion>(
      await llamar(`/reep/articulos/${divergen.id}/asignaciones/vista-previa?parId=reep-par-3`),
    )
    expect(v2).toMatchObject({ orden: 3, esDesempate: true })
    const tercera = await json<ResultadoAsignacion>(
      await asignar('reep', divergen.id, 'reep-par-3'),
    )
    expect(tercera.asignacion.esDesempate).toBe(true)
  })

  it('a reminder is queued, not sent now (simulated; RF-29 is still under review)', async () => {
    const articulo = await articuloNuevo('reep', '2026-047', 'reep-au-3')
    const r = await json<ResultadoAsignacion>(await asignar('reep', articulo.id, 'reep-par-1'))
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
