import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'

describe('peer base (/:revista/pares)', () => {
  it('shows the journal own base and hides blocked peers by default', async () => {
    montarRuta('/reep/pares')
    expect(await screen.findByText('15 pares · base propia de esta revista')).toBeInTheDocument()
    expect(await screen.findByText('11 pares')).toBeInTheDocument()
    expect(screen.queryByText('Paula Andrea Narváez')).toBeNull()
    expect(screen.getAllByText('Conflicto posible').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0)
  })

  it('never shows peers of the other journal', async () => {
    montarRuta('/ire/pares')
    expect(await screen.findByText('15 pares · base propia de esta revista')).toBeInTheDocument()
    expect(await screen.findByText('Alberto Portilla Rosas')).toBeInTheDocument()
    expect(screen.queryByText('Luz Marina Burbano')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Educación inclusiva' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Memoria y conflicto' })).toBeInTheDocument()
  })

  it('suggests the registered areas and filters by clicking one', async () => {
    const { user } = montarRuta('/reep/pares')
    const chip = await screen.findByRole('button', { name: 'Educación inclusiva' })
    expect(document.querySelectorAll('#areas-registradas option').length).toBeGreaterThan(3)
    await user.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(screen.getByText('2 pares con estos filtros')).toBeInTheDocument())
    const tabla = screen.getByRole('table', { name: 'Pares evaluadores de la revista' })
    expect(within(tabla).getByText('Luz Marina Burbano')).toBeInTheDocument()
    expect(within(tabla).queryByText('Jorge Andrés Rosero')).toBeNull()
  })

  it('filters by university and by blocked status, showing the blocked badge with text', async () => {
    const { user } = montarRuta('/reep/pares')
    await screen.findByText('11 pares')
    await elegirOpcion(user, 'Estado', 'Bloqueados')
    expect(
      await screen.findByText('4 pares con estos filtros'.replace(' con estos filtros', '')),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Bloqueado').length).toBeGreaterThanOrEqual(4)
    expect(screen.getByText('Paula Andrea Narváez')).toBeInTheDocument()
  })

  it('a row opens the peer record; without an article there is no "Asignar" column', async () => {
    montarRuta('/reep/pares')
    const enlace = await screen.findByRole('link', { name: 'Abrir la ficha de Luz Marina Burbano' })
    expect(enlace).toHaveAttribute('href', '/reep/pares/reep-par-1')
    expect(screen.queryByRole('columnheader', { name: 'Asignar' })).toBeNull()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/pares')
    await screen.findByText('11 pares')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('registering a peer', () => {
  it('validates the fields and offers the data-treatment authorization', async () => {
    const { user } = montarRuta('/reep/pares')
    await user.click(await screen.findByRole('button', { name: 'Registrar par' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar par evaluador' })
    expect(
      within(dialogo).getByRole('checkbox', {
        name: /autoriza el tratamiento de sus datos personales/,
      }),
    ).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar par' }))
    expect(await within(dialogo).findByText('Escriba el nombre del par.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Escriba el correo electrónico.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Escriba el área temática.')).toBeInTheDocument()
  })

  it('registers a peer in this journal only and refuses a repeated email', async () => {
    const { user, unmount } = montarRuta('/reep/pares')
    await user.click(await screen.findByRole('button', { name: 'Registrar par' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar par evaluador' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Marta Lucía Gómez')
    await user.type(within(dialogo).getByLabelText('Correo electrónico'), 'ml.gomez@udenar.edu.co')
    await user.type(within(dialogo).getByLabelText('Universidad'), 'Universidad de Nariño')
    await user.type(within(dialogo).getByLabelText('Área temática'), 'Educación rural')
    await user.click(within(dialogo).getByRole('checkbox'))
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar par' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o correo' }), 'gomez')
    expect(await screen.findByText('Marta Lucía Gómez')).toBeInTheDocument()

    // Same email again: the API refuses it and the dialog says why
    await user.click(screen.getByRole('button', { name: 'Registrar par' }))
    const otro = await screen.findByRole('dialog', { name: 'Registrar par evaluador' })
    await user.type(within(otro).getByLabelText('Nombre'), 'Otra Persona')
    await user.type(within(otro).getByLabelText('Correo electrónico'), 'ml.gomez@udenar.edu.co')
    await user.type(within(otro).getByLabelText('Universidad'), 'Universidad de Nariño')
    await user.type(within(otro).getByLabelText('Área temática'), 'Educación rural')
    await user.click(within(otro).getByRole('button', { name: 'Registrar par' }))
    expect(
      await within(otro).findByText('Ya existe un par con ese correo en esta revista'),
    ).toBeInTheDocument()
    unmount()

    montarRuta('/ire/pares')
    await screen.findByText('15 pares · base propia de esta revista')
    expect(screen.queryByText('Marta Lucía Gómez')).toBeNull()
  })

  it('the Auxiliar can register peers too', async () => {
    montarRuta('/reep/pares', AUXILIAR)
    expect(await screen.findByRole('button', { name: 'Registrar par' })).toBeInTheDocument()
  })
})

describe('blocked peers (/pares/bloqueados)', () => {
  it('lists blocked peers with reason and date', async () => {
    montarRuta('/reep/pares/bloqueados')
    expect(await screen.findByText('4 pares no reciben nuevas invitaciones')).toBeInTheDocument()
    expect(screen.getAllByText('No desea participar', { selector: 'td' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sin respuesta · 2.º intento').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Volver a la base' })).toHaveAttribute(
      'href',
      '/reep/pares',
    )
  })

  it('the Administradora unblocks with a reason and the peer leaves the list', async () => {
    const { user } = montarRuta('/reep/pares/bloqueados')
    await user.click(
      await screen.findByRole('button', { name: /Desbloquear a Paula Andrea Narváez/ }),
    )
    const dialogo = await screen.findByRole('dialog', {
      name: 'Desbloquear a Paula Andrea Narváez',
    })
    await user.click(within(dialogo).getByRole('button', { name: 'Desbloquear' }))
    expect(await within(dialogo).findByText('Escriba el motivo.')).toBeInTheDocument()
    await user.type(
      within(dialogo).getByLabelText('Motivo'),
      'Manifestó interés en volver a participar.',
    )
    await user.click(within(dialogo).getByRole('button', { name: 'Desbloquear' }))
    expect(await screen.findByText('3 pares no reciben nuevas invitaciones')).toBeInTheDocument()
    expect(screen.queryByText('Paula Andrea Narváez')).toBeNull()
  })

  it('the Auxiliar can see the list and unblock', async () => {
    montarRuta('/reep/pares/bloqueados', AUXILIAR)
    expect(await screen.findByText('4 pares no reciben nuevas invitaciones')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Desbloquear/ }).length).toBeGreaterThan(0)
  })
})

describe('peer record (/pares/:id)', () => {
  it('shows data, data-treatment authorization date, summary and participations', async () => {
    montarRuta('/reep/pares/reep-par-1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Luz Marina Burbano' }),
    ).toBeInTheDocument()
    expect(screen.getByText('lm.burbano@udenar.edu.co')).toBeInTheDocument()
    expect(
      screen.getByText('Autorizó el tratamiento de sus datos el 14 de marzo de 2024.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Evaluaciones entregadas')).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: 'Participaciones del par' })
    expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(2)
    expect(within(tabla).getAllByText('Emitida').length).toBeGreaterThan(0)
    expect(within(tabla).getAllByText('Pendiente').length).toBeGreaterThan(0)
  })

  it('a blocked peer is announced with text, and the Administradora can block / unblock', async () => {
    const { user } = montarRuta('/reep/pares/reep-par-5')
    expect(await screen.findByText('Par bloqueado')).toBeInTheDocument()
    expect(screen.getAllByText(/No desea participar/).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Desbloquear' }))
    const dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Quiere volver.')
    await user.click(within(dialogo).getByRole('button', { name: 'Desbloquear' }))
    await waitFor(() => expect(screen.queryByText('Par bloqueado')).toBeNull())

    await user.click(await screen.findByRole('button', { name: 'Bloquear' }))
    const bloqueo = await screen.findByRole('dialog', { name: 'Bloquear a Paula Andrea Narváez' })
    await user.click(within(bloqueo).getByRole('button', { name: 'Bloquear' }))
    expect(await screen.findByText('Par bloqueado')).toBeInTheDocument()
  })

  it('the Auxiliar can edit and block', async () => {
    montarRuta('/reep/pares/reep-par-1', AUXILIAR)
    await screen.findByRole('heading', { level: 1, name: 'Luz Marina Burbano' })
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeInTheDocument()
  })

  it('a peer of the other journal is not found', async () => {
    montarRuta('/ire/pares/reep-par-1')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Par evaluador no encontrado' }),
    ).toBeInTheDocument()
  })
})
