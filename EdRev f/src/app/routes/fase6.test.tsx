import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import { montarRuta } from '@/test/montarRuta'

describe('constancias screen', () => {
  it('previews a pending constancia, issues it and leaves the mail in Correos enviados', async () => {
    const { user } = montarRuta('/reep/constancias')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Constancias' }),
    ).toBeInTheDocument()
    const tabla = await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    const botones = await within(tabla).findAllByRole('button', {
      name: /^Emitir la constancia de/,
    })
    const nombre = /de (.+)$/.exec(botones[0]?.textContent ?? '')?.[1] ?? ''
    await user.click(botones[0] as HTMLElement)

    expect(await screen.findByText(/HACE CONSTAR QUE/)).toBeInTheDocument()
    expect(screen.getAllByText(nombre).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Emitir y enviar' }))
    expect(await screen.findByText(/Quedó registrada en Correos enviados/)).toBeInTheDocument()
    const emitidas = screen.getByRole('table', { name: /emitidas/i })
    expect(within(emitidas).getAllByText(nombre).length).toBeGreaterThan(0)
  })

  it('"Emitir pendientes" asks for confirmation and empties the pending list', async () => {
    const { user } = montarRuta('/reep/constancias')
    await user.click(await screen.findByRole('button', { name: 'Emitir pendientes' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Emitir las constancias pendientes' })
    await user.click(within(dialogo).getByRole('button', { name: 'Emitir y enviar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/No hay constancias pendientes/)).toBeInTheDocument()
  })

  it('the Auxiliar can download but neither issue nor reissue', async () => {
    montarRuta('/reep/constancias', AUXILIAR)
    await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    expect(screen.queryByRole('button', { name: /^Emitir/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Reenviar/ })).toBeNull()
    expect((await screen.findAllByRole('button', { name: /^Descargar/ })).length).toBeGreaterThan(0)
    expect(screen.getByText(/Solo la Administradora emite constancias/)).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/constancias')
    await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('sent mail screen', () => {
  it('shows a bounced address, corrects it and marks the failed one as reintentado', async () => {
    const { user } = montarRuta('/reep/correos')
    await screen.findByRole('button', { name: 'Corregir y reenviar' })
    await user.click(screen.getByRole('button', { name: 'Corregir y reenviar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Corregir y reenviar' })
    const campo = within(dialogo).getByLabelText('Correo del par')
    await user.clear(campo)
    await user.type(campo, 'corregido@universidad.edu.co')
    await user.click(within(dialogo).getByRole('button', { name: 'Corregir y reenviar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await screen.findAllByText('Reintentado')).length).toBeGreaterThan(0)
  })

  it('"Reintentar fallidos" clears the failures; the Auxiliar can also retry', async () => {
    const { user } = montarRuta('/reep/correos', AUXILIAR)
    await user.click(await screen.findByRole('button', { name: 'Reintentar fallidos' }))
    expect(await screen.findByText(/Se reintentaron \d+ envíos/)).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/correos')
    await screen.findByRole('button', { name: 'Corregir y reenviar' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('dashboards', () => {
  it('the journal dashboard links its alerts to the filtered article list and to constancias', async () => {
    const { user, router } = montarRuta('/reep/tablero')
    await screen.findByRole('heading', { level: 1, name: 'Tablero' })
    const enlace = (await screen.findAllByRole('link', { name: /^Ver los \d+$/ }))[0] as HTMLElement
    await user.click(enlace)
    await waitFor(() => expect(router.state.location.search).toBe('?sinResponder=1'))
    expect(await screen.findByText('Artículos con pares sin responder')).toBeInTheDocument()
  })

  it('does not show anything of the other journal', async () => {
    montarRuta('/ire/tablero')
    await screen.findByRole('heading', { level: 1, name: 'Tablero' })
    await screen.findByRole('heading', { level: 2, name: 'Pares sin responder' })
    const enlaces = await screen.findAllByRole('link', { name: /^Abrir el artículo/ })
    expect(enlaces.every((e) => e.getAttribute('href')?.startsWith('/ire/'))).toBe(true)
  })

  it('Inicio general summarises both journals', async () => {
    montarRuta('/inicio')
    await screen.findByRole('heading', { level: 1, name: 'Inicio general' })
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Educación y Pedagogía' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Investigium IRE' })).toBeInTheDocument()
  })
})

describe('reports (Administradora only)', () => {
  it('generates the comparative report', async () => {
    montarRuta('/informes')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Informe de gestión' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: /Comparativo/i }),
    ).toBeInTheDocument()
  })

  it('the Auxiliar is turned away', async () => {
    montarRuta('/informes', AUXILIAR)
    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 1, name: 'Informe de gestión' })).toBeNull(),
    )
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
  })
})

describe('administration', () => {
  it('rejects a constancia template without the required markers and shows the error', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await screen.findByRole('heading', { level: 2, name: 'Plantillas y cuentas de correo' })
    await user.click(await screen.findByRole('combobox', { name: 'Plantilla' }))
    await user.click(await screen.findByRole('option', { name: 'Constancia de participación' }))
    const texto = await screen.findByLabelText('Texto')
    await user.clear(texto)
    await user.type(texto, 'HACE CONSTAR QUE alguien evaluó.')
    await user.click(screen.getByRole('button', { name: 'Guardar plantilla' }))
    expect(await screen.findByText(/Falta el marcador obligatorio/)).toBeInTheDocument()
    expect(screen.queryByText(/Plantilla guardada/)).toBeNull()
  })

  it('shows the sender accounts without any credential', async () => {
    montarRuta('/administracion/plantillas')
    expect(await screen.findByDisplayValue('editorial.eyp@gmail.com')).toBeInTheDocument()
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull()
  })

  it('the audit log shows the two journals and can be filtered by journal', async () => {
    const { user } = montarRuta('/administracion/auditoria')
    expect(await screen.findByText(/acciones registradas en las dos revistas/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Revista' }))
    await user.click(await screen.findByRole('option', { name: 'Investigium IRE' }))
    await waitFor(() => {
      const tabla = screen.getByRole('table')
      const filas = within(tabla).getAllByRole('row').slice(1)
      expect(filas.length).toBeGreaterThan(0)
      expect(filas.every((f) => /Investigium IRE/.test(f.textContent ?? ''))).toBe(true)
    })
  })

  it('the Auxiliar cannot open administration', async () => {
    montarRuta('/administracion/usuarios', AUXILIAR)
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Usuarios/ })).toBeNull())
  })

  it('a constancia issued from the screen is traced in the sent mail', async () => {
    const { user } = montarRuta('/reep/constancias')
    const tabla = await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    const botones = await within(tabla).findAllByRole('button', {
      name: /^Emitir la constancia de/,
    })
    await user.click(botones[0] as HTMLElement)
    await user.click(await screen.findByRole('button', { name: 'Emitir y enviar' }))
    await screen.findByText(/Quedó registrada/)
    const correos = await json<{ items: Array<{ tipo: string }> }>(
      await llamar('/reep/correos?tipo=agradecimiento&porPagina=100'),
    )
    expect(correos.items.length).toBeGreaterThan(0)
  })
})
