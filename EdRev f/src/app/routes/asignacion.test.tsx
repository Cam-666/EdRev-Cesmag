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
  return json<ArticuloDetalle>(r)
}

async function asignarApi(articulo: string, parId: string) {
  return json<ResultadoAsignacion>(
    await llamar(`/reep/articulos/${articulo}/asignaciones`, { metodo: 'POST', cuerpo: { parId } }),
  )
}

describe('assigning a peer: article → peers → preview → confirm', () => {
  it('walks the whole flow and the invitation leaves a trace in the article history', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-009/pares')
    const lista = await screen.findByRole('list', { name: 'Pares asignados' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2)

    await user.click(screen.getByRole('link', { name: 'Asignar par' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/pares'))
    expect(await screen.findByText('Asignar un par al artículo 2026-009')).toBeInTheDocument()

    await user.click(await screen.findByRole('link', { name: /Asignar a Hernán Delgado Ortega/ }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Asignar par evaluador' }),
    ).toBeInTheDocument()

    // Preview before confirming: sender, recipient, subject, body and the no-attachments note
    const vista = await screen.findByRole('region', { name: 'Vista previa' })
    expect(within(vista).getByText('editorial.eyp@gmail.com')).toBeInTheDocument()
    expect(within(vista).getByText('h.delgado@unicauca.edu.co')).toBeInTheDocument()
    expect(
      within(vista).getByText(
        'Invitación a evaluar un artículo · Revista Electrónica en Educación y Pedagogía',
      ),
    ).toBeInTheDocument()
    expect(within(vista).getByText(/Apreciado\(a\) Hernán Delgado Ortega/)).toBeInTheDocument()
    expect(within(vista).getByText(/Sin adjuntos/)).toBeInTheDocument()
    expect(screen.getByText('3 · tercer par')).toBeInTheDocument()
    expect(screen.queryByText(/conflicto de interés/i)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Asignar y enviar' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/2026-009/pares'),
    )
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
    expect(
      screen.getByText(/h\.delgado@unicauca\.edu\.co\)\. Quedó registrada/),
    ).toBeInTheDocument()
    expect(
      within(await screen.findByRole('list', { name: 'Pares asignados' })).getAllByRole('listitem'),
    ).toHaveLength(3)

    // A third peer is the maximum: no more "Asignar par"
    expect(screen.queryByRole('link', { name: 'Asignar par' })).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    const tabla = await screen.findByRole('table', { name: 'Correos enviados por este artículo' })
    const fila = within(tabla)
      .getAllByText('Invitación a evaluar')
      .map((c) => c.closest('tr') as HTMLElement)
    expect(fila.some((f) => within(f).queryByText('h.delgado@unicauca.edu.co') !== null)).toBe(true)
    expect(screen.getByText('Asignó el par 3')).toBeInTheDocument()
  })

  it('warns about a conflict of interest, naming the authors, and still lets the user assign', async () => {
    const { user, router } = montarRuta('/reep/pares/asignar?articulo=2026-033&par=reep-par-6')
    const aviso = await screen.findByText(/pertenecen a Universidad de Nariño/)
    expect(aviso).toHaveTextContent('Paola Andrea Guerrero, Carolina Isabel Benavides')
    expect(aviso).toHaveTextContent('Puede asignarlo de todos modos.')
    await user.click(screen.getByRole('button', { name: 'Asignar y enviar' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/2026-033/pares'),
    )
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
  })

  it('marks "Conflicto posible" in the list against the authors of the article being worked on', async () => {
    montarRuta('/reep/pares?articulo=2026-033')
    const fila = (await screen.findByText('Claudia Jurado')).closest('tr') as HTMLElement
    expect(within(fila).getByText('Conflicto posible')).toBeInTheDocument()
    // The warning never removes the "Asignar" action
    expect(within(fila).getByRole('link', { name: /Asignar a Claudia Jurado/ })).toBeInTheDocument()
  })

  it('refuses a blocked peer with the reason', async () => {
    montarRuta('/reep/pares/asignar?articulo=2026-033&par=reep-par-5')
    expect(await screen.findByText('No se puede asignar este par')).toBeInTheDocument()
    expect(
      screen.getByText('El par está bloqueado y no recibe nuevas invitaciones'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Asignar y enviar' })).toBeNull()
  })

  it('without an article it explains how to start; with only the article it goes to the peer list', async () => {
    const sin = montarRuta('/reep/pares/asignar')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Asignar par evaluador' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a los artículos' })).toHaveAttribute(
      'href',
      '/reep/articulos',
    )
    sin.unmount()

    const solo = montarRuta('/reep/pares/asignar?articulo=2026-033')
    await waitFor(() => expect(solo.router.state.location.pathname).toBe('/reep/pares'))
    expect(solo.router.state.location.search).toBe('?articulo=2026-033')
  })

  it('the Auxiliar can assign peers', async () => {
    const { user, router } = montarRuta(
      '/reep/pares/asignar?articulo=2026-033&par=reep-par-2',
      AUXILIAR,
    )
    await user.click(await screen.findByRole('button', { name: 'Asignar y enviar' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/2026-033/pares'),
    )
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()
  })

  it('the assignment screen has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/pares/asignar?articulo=2026-033&par=reep-par-2')
    await screen.findByRole('region', { name: 'Vista previa' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('bounced invitation (RF-27)', () => {
  it('warns on screen, keeps the assignment and lets the user correct the email and resend', async () => {
    const par = await json<ParDetalle>(
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
    const { user, router } = montarRuta(`/reep/pares/asignar?articulo=2026-033&par=${par.id}`)
    await user.click(await screen.findByRole('button', { name: 'Asignar y enviar' }))
    expect(await screen.findByText('La invitación no se pudo entregar')).toBeInTheDocument()
    expect(screen.getByText(/La dirección par@invalido\.test rebotó/)).toBeInTheDocument()
    // The assignment was kept
    expect(
      within(await screen.findByRole('list', { name: 'Pares asignados' })).getByText('Par Rebote'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Corregir correo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/reep/pares/${par.id}`))
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
  it('Administradora: resend, reminder and register the answer; Auxiliar: only resend and reminder', async () => {
    const admin = montarRuta('/reep/articulos/2026-012/pares')
    expect(
      await screen.findByRole('button', { name: /Reenviar invitación a Rodrigo Eraso/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Recordatorio a Rodrigo Eraso/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Registrar respuesta de Rodrigo Eraso/ }),
    ).toBeInTheDocument()
    admin.unmount()

    montarRuta('/reep/articulos/2026-012/pares', AUXILIAR)
    expect(
      await screen.findByRole('button', { name: /Reenviar invitación a Rodrigo Eraso/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar respuesta/ })).toBeNull()
  })

  it('a reminder is queued and says so', async () => {
    const { user } = montarRuta('/reep/articulos/2026-012/pares')
    await user.click(await screen.findByRole('button', { name: /Recordatorio a Rodrigo Eraso/ }))
    expect(
      await screen.findByText('Recordatorio a Rodrigo Eraso en cola de envío.'),
    ).toBeInTheDocument()
  })

  it('resending moves a first invitation to "2.º intento"', async () => {
    const { user } = montarRuta('/reep/articulos/2026-009/pares')
    await user.click(
      await screen.findByRole('button', { name: /Reenviar invitación a Luz Marina Burbano/ }),
    )
    expect(
      await screen.findByText('Invitación reenviada a Luz Marina Burbano.'),
    ).toBeInTheDocument()
    expect(await screen.findAllByText('2.º intento')).not.toHaveLength(0)
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

  it('accepted → mark delivery (pending constancia) → register concept', async () => {
    const { user } = montarRuta('/reep/articulos/2026-009/pares')
    await user.click(
      await screen.findByRole('button', { name: /Marcar entrega de Sandra Liliana Cuasapud/ }),
    )
    const dialogo = await screen.findByRole('dialog', { name: 'Marcar entrega' })
    expect(within(dialogo).getByLabelText('Fecha de entrega')).toHaveValue(hoy())
    await user.click(within(dialogo).getByRole('button', { name: 'Marcar entrega' }))
    expect(
      await screen.findByText(
        'Entrega de Sandra Liliana Cuasapud registrada. Su constancia quedó pendiente.',
      ),
    ).toBeInTheDocument()

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

  it('offers "Asignar desempate" only when the first two concepts contradict', async () => {
    const articulo = await articuloNuevo('2026-070')
    const a1 = await asignarApi(articulo.id, 'reep-par-1')
    const a2 = await asignarApi(articulo.id, 'reep-par-2')
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
    await user.click(screen.getByRole('link', { name: 'Asignar desempate' }))
    await user.click(await screen.findByRole('link', { name: /Asignar a Hernán Delgado Ortega/ }))
    expect(await screen.findByText('3 · par de desempate')).toBeInTheDocument()
  })

  it('without contradiction there is no "Asignar desempate" (a plain third peer is offered)', async () => {
    montarRuta('/reep/articulos/2026-024/pares')
    await screen.findByRole('list', { name: 'Pares asignados' })
    expect(screen.queryByRole('link', { name: 'Asignar desempate' })).toBeNull()
  })

  it('an archived article offers no assignment', async () => {
    montarRuta('/reep/articulos/2026-007/pares')
    await screen.findByText('Aún no hay pares asignados a este artículo.')
    expect(screen.queryByRole('link', { name: 'Asignar par' })).toBeNull()
  })
})
