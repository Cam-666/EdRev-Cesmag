import { act, screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'
import type { ArticuloDetalle } from '@/types/articulo'
import type { ParDetalle, ResultadoAsignacion } from '@/types/par'

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A new article approved by the committee, ready to receive peers. */
async function articuloNuevo(numero: string, autorId = 'reep-au-3') {
  const r = await llamar('/reep/articulos', {
    metodo: 'POST',
    cuerpo: {
      numeroOjs: numero,
      titulo: `Artículo ${numero}`,
      tipo: 'investigacion',
      fechaPostulacion: '2026-10-01',
      autores: [{ autorId }],
    },
  })
  const articulo = await json<ArticuloDetalle>(r)
  await llamar(`/reep/articulos/${articulo.id}/rondas`, {
    metodo: 'POST',
    cuerpo: { coincidencias: 5, atribuidoIa: 1, resultado: 'aprobado', observacion: '' },
  })
  return articulo
}

async function candidatoApi(articulo: string, n: number) {
  return json<ResultadoAsignacion>(
    await llamar(`/reep/articulos/${articulo}/asignaciones`, {
      metodo: 'POST',
      cuerpo: {
        nuevo: {
          nombre: `Candidato ${n}`,
          correo: `candidato${n}@udenar.edu.co`,
          universidad: 'Universidad de Nariño',
          area: 'Educación rural',
        },
      },
    }),
  )
}

async function abrirPanel(user: { click: (e: Element) => Promise<void> }) {
  await user.click(await screen.findByRole('button', { name: 'Asignar par' }))
  return screen.findByRole('region', { name: 'Asignar par evaluador' })
}

describe('assigning a peer from the article sheet', () => {
  it('offers «Asignar par» only once the committee approved the article', async () => {
    montarRuta('/reep/articulos/2026-032/pares')
    expect(await screen.findByText('El comité aún no aprueba el artículo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asignar par' })).toBeNull()
  })

  it('assigns an available peer: the invitation goes out and the peer joins the article', async () => {
    const { user } = montarRuta('/reep/articulos/2026-033/pares')
    const panel = await abrirPanel(user)
    const tabla = await within(panel).findByRole('table', { name: 'Pares disponibles' })
    const boton = (await within(tabla).findAllByRole('button', { name: /^Asignar a / }))[0]
    const nombre = (boton?.textContent ?? '').replace(/^Asignar a /, '')
    await user.click(boton as HTMLElement)
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
    const lista = await screen.findByRole('list', { name: 'Pares asignados' })
    expect(await within(lista).findByText(nombre)).toBeInTheDocument()
    // The panel stays open to keep inviting; the assigned peer is no longer available
    await waitFor(() =>
      expect(within(tabla).queryByRole('button', { name: `Asignar a ${nombre}` })).toBeNull(),
    )
    const h = await json<{ correos: Array<{ tipo: string }> }>(
      await llamar('/reep/articulos/2026-033/historial'),
    )
    expect(h.correos[0]?.tipo).toBe('invitacion')
  })

  it('registers a new candidate in the base and invites them right away', async () => {
    const { user } = montarRuta('/reep/articulos/2026-033/pares')
    const panel = await abrirPanel(user)
    await user.click(within(panel).getByRole('tab', { name: 'Registrar un candidato nuevo' }))
    await user.click(within(panel).getByRole('button', { name: 'Registrar y enviar invitación' }))
    expect(await within(panel).findByText('Escriba el nombre del par.')).toBeInTheDocument()

    await user.type(within(panel).getByLabelText('Nombre'), 'Marta Lucía Gómez')

    await user.type(within(panel).getByLabelText('Profesión o título'), 'Magíster en Educación')
    await user.type(within(panel).getByLabelText('Correo electrónico'), 'ml.gomez@udenar.edu.co')
    await user.type(within(panel).getByLabelText('Universidad'), 'Universidad de Nariño')
    await user.type(within(panel).getByLabelText('Área temática'), 'Educación rural')
    await user.click(within(panel).getByRole('button', { name: 'Registrar y enviar invitación' }))
    expect(
      await screen.findByText(/Se envió la invitación a Marta Lucía Gómez/),
    ).toBeInTheDocument()
    const base = await json<{ total: number }>(await llamar('/reep/pares?estado=todos&q=gomez'))
    expect(base.total).toBe(1)
  })

  it('marks «Conflicto posible» and warns after assigning, without blocking', async () => {
    const articulo = await articuloNuevo('2026-071', 'reep-au-2') // author from Universidad CESMAG
    const { user } = montarRuta(`/reep/articulos/${articulo.id}/pares`)
    const panel = await abrirPanel(user)
    const tabla = await within(panel).findByRole('table', { name: 'Pares disponibles' })
    const fila = (await within(tabla).findAllByText('Conflicto posible'))[0]?.closest('tr')
    await user.click(within(fila as HTMLElement).getByRole('button', { name: /^Asignar a / }))
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
    expect(screen.getByText('Conflicto posible', { selector: 'p' })).toBeInTheDocument()
  })

  it('the committee review hands over with the panel open, and the Auxiliar can assign', async () => {
    montarRuta('/reep/articulos/2026-033/pares?asignar=1', AUXILIAR)
    expect(await screen.findByRole('region', { name: 'Asignar par evaluador' })).toBeInTheDocument()
  })

  it('has no accessibility violations with the panel open', async () => {
    const { container } = montarRuta('/reep/articulos/2026-033/pares?asignar=1')
    const panel = await screen.findByRole('region', { name: 'Asignar par evaluador' })
    await within(panel).findByRole('table', { name: 'Pares disponibles' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('bounced invitation (RF-27)', () => {
  it('warns on screen, keeps the assignment and lets the user correct the email and resend', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-033/pares')
    const panel = await abrirPanel(user)
    await user.click(within(panel).getByRole('tab', { name: 'Registrar un candidato nuevo' }))
    await user.type(within(panel).getByLabelText('Nombre'), 'Par Rebote')
    await user.type(within(panel).getByLabelText('Profesión o título'), 'Magíster en Educación')
    await user.type(within(panel).getByLabelText('Correo electrónico'), 'par@invalido.test')
    await user.type(within(panel).getByLabelText('Universidad'), 'Universidad del Valle')
    await user.type(within(panel).getByLabelText('Área temática'), 'Educación rural')
    await user.click(within(panel).getByRole('button', { name: 'Registrar y enviar invitación' }))
    expect(await screen.findByText('La invitación no se pudo entregar')).toBeInTheDocument()
    expect(screen.getByText(/La dirección par@invalido\.test rebotó/)).toBeInTheDocument()
    // The assignment was kept
    expect(
      within(await screen.findByRole('list', { name: 'Pares asignados' })).getByText('Par Rebote'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Corregir correo' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/reep\/pares\/reep-par-n/),
    )
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar par evaluador' })
    const correo = within(dialogo).getByLabelText('Correo electrónico')
    await user.clear(correo)
    await user.type(correo, 'par.corregido@univalle.edu.co')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await act(async () => {
      await router.navigate('/reep/articulos/2026-033/pares')
    })
    await user.click(
      await screen.findByRole('button', { name: /Reenviar invitación a Par Rebote/ }),
    )
    expect(await screen.findByText('Invitación reenviada a Par Rebote.')).toBeInTheDocument()
  })
})

describe('actions on an assigned peer', () => {
  it('no reminder and no manual resend: only the answer, while the invitation was delivered (D7)', async () => {
    montarRuta('/reep/articulos/2026-012/pares', AUXILIAR)
    expect(
      await screen.findByRole('button', { name: /Registrar respuesta de Rodrigo Eraso/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recordatorio/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Reenviar invitación/ })).toBeNull()
    expect(screen.getAllByText('2.º intento').length).toBeGreaterThan(0)
  })

  it('an issued constancia can be downloaded and resent from the article (HU-23)', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034/pares')
    const descargar = (
      await screen.findAllByRole('button', { name: /^Descargar constancia de/ })
    )[0]
    expect(descargar).toBeInTheDocument()
    const reenviar = (await screen.findAllByRole('button', { name: /^Reenviar constancia a/ }))[0]
    await user.click(reenviar as HTMLElement)
    expect(await screen.findByText(/^Constancia reenviada a/)).toBeInTheDocument()
  })

  it('no answer after the 2nd attempt blocks the peer, after warning about it', async () => {
    const { user } = montarRuta('/reep/articulos/2026-012/pares')
    await user.click(
      await screen.findByRole('button', { name: /Registrar respuesta de Rodrigo Eraso/ }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Respuesta del par' })
    await elegirOpcion(user, 'Respuesta del par', 'No respondió tras el 2.º intento')
    expect(within(dialogo).getByText(/pasará a la lista de bloqueados/)).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar respuesta' }))
    expect(
      await screen.findByText('Rodrigo Eraso pasó a la lista de bloqueados.'),
    ).toBeInTheDocument()
    const par = await json<ParDetalle>(await llamar('/reep/pares/reep-par-11'))
    expect(par.bloqueo?.motivo).toBe('sin-respuesta')
  })

  it('accepted → mark delivery → «Emitir constancia» offered right away → register concept', async () => {
    const { user } = montarRuta('/reep/articulos/2026-009/pares')
    await user.click(
      await screen.findByRole('button', { name: /Marcar entrega de Sandra Liliana Cuasapud/ }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Marcar entrega' })
    expect(within(dialogo).getByLabelText('Fecha de entrega')).toHaveValue(hoy())
    await user.click(within(dialogo).getByRole('button', { name: 'Marcar entrega' }))

    // RF-23: the constancia is offered right away, with the journal's template and PDF background
    const constancia = await screen.findByRole('dialog', {
      name: 'Emitir la constancia de Sandra Liliana Cuasapud',
    })
    expect(within(constancia).getByText(/Entrega registrada/)).toBeInTheDocument()
    expect(await within(constancia).findByText(/HACE CONSTAR QUE/)).toBeInTheDocument()
    expect(
      within(constancia).getByText('Fondo: constancia-educacion-pedagogia.pdf'),
    ).toBeInTheDocument()
    await user.click(within(constancia).getByRole('button', { name: 'Emitir y enviar' }))
    expect(
      await screen.findByText('Constancia enviada a Sandra Liliana Cuasapud.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click(
      await screen.findByRole('button', { name: /Registrar concepto de Sandra Liliana Cuasapud/ }),
    )
    await screen.findByRole('dialog', { name: 'Registrar concepto' })
    await user.click(screen.getByRole('button', { name: 'Registrar concepto' }))
    expect(await screen.findByText('Seleccione el concepto del par.')).toBeInTheDocument()
    await elegirOpcion(user, 'Concepto', 'Publicable')
    await user.click(screen.getByRole('button', { name: 'Registrar concepto' }))
    expect(
      await screen.findByText('Concepto de Sandra Liliana Cuasapud registrado.'),
    ).toBeInTheDocument()

    const lista = await screen.findByRole('list', { name: 'Pares asignados' })
    const fila = within(lista).getByText('Sandra Liliana Cuasapud').closest('li') as HTMLElement
    await waitFor(() => expect(within(fila).getByText('Publicable')).toBeInTheDocument())
    expect(within(fila).getByText('Entregó')).toBeInTheDocument()
  })

  it('«Más tarde» leaves the constancia pending and it can be issued later from the peer', async () => {
    const { user } = montarRuta('/reep/articulos/2026-009/pares')
    await user.click(
      await screen.findByRole('button', { name: /Marcar entrega de Sandra Liliana Cuasapud/ }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Marcar entrega' })
    await user.click(within(dialogo).getByRole('button', { name: 'Marcar entrega' }))
    const constancia = await screen.findByRole('dialog', {
      name: 'Emitir la constancia de Sandra Liliana Cuasapud',
    })
    await user.click(within(constancia).getByRole('button', { name: 'Más tarde' }))
    await user.click(
      await screen.findByRole('button', { name: /Emitir constancia de Sandra Liliana Cuasapud/ }),
    )
    expect(
      await screen.findByRole('dialog', {
        name: 'Emitir la constancia de Sandra Liliana Cuasapud',
      }),
    ).toBeInTheDocument()
  })

  it('offers «Asignar par de desempate» only when the first two concepts contradict', async () => {
    const articulo = await articuloNuevo('2026-070')
    const a1 = await candidatoApi(articulo.id, 1)
    const a2 = await candidatoApi(articulo.id, 2)
    for (const [id, concepto] of [
      [a1.asignacion.id, 'publicable'],
      [a2.asignacion.id, 'no-publicable'],
    ] as const) {
      await llamar(`/reep/asignaciones/${id}/respuesta`, {
        metodo: 'POST',
        cuerpo: { respuesta: 'acepto' },
      })
      await llamar(`/reep/asignaciones/${id}/entrega`, { metodo: 'POST', cuerpo: { fecha: hoy() } })
      await llamar(`/reep/asignaciones/${id}/concepto`, { metodo: 'POST', cuerpo: { concepto } })
    }

    const { user } = montarRuta(`/reep/articulos/${articulo.id}/pares`)
    expect(
      await screen.findByText('Los conceptos de los dos primeros pares se contradicen.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Asignar par de desempate' }))
    const panel = await screen.findByRole('region', { name: 'Asignar par de desempate' })
    const tabla = await within(panel).findByRole('table', { name: 'Pares disponibles' })
    await user.click(
      (await within(tabla).findAllByRole('button', { name: /^Asignar a / }))[0] as HTMLElement,
    )
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
    const lista = screen.getByRole('list', { name: 'Pares asignados' })
    const tercero = (await within(lista).findAllByRole('listitem'))[2] as HTMLElement
    expect(within(tercero).getByText('Desempate')).toBeInTheDocument()
  })

  it('without contradiction there is no tiebreaker', async () => {
    montarRuta('/reep/articulos/2026-024/pares')
    await screen.findByRole('list', { name: 'Pares asignados' })
    expect(screen.queryByRole('button', { name: 'Asignar par de desempate' })).toBeNull()
  })

  it('an archived article offers no assignment', async () => {
    montarRuta('/reep/articulos/2026-007/pares')
    await screen.findByText('Aún no hay pares asignados a este artículo.')
    expect(screen.queryByRole('button', { name: 'Asignar par' })).toBeNull()
  })
})
