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

    expect(await screen.findByText(/CERTIFICA QUE/)).toBeInTheDocument()
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

  it('the Auxiliar can issue, reissue and download', async () => {
    montarRuta('/reep/constancias', AUXILIAR)
    await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    expect(await screen.findByRole('button', { name: 'Emitir pendientes' })).toBeInTheDocument()
    expect((await screen.findAllByRole('button', { name: /^Reenviar/ })).length).toBeGreaterThan(0)
    expect((await screen.findAllByRole('button', { name: /^Descargar/ })).length).toBeGreaterThan(0)
  })

  it('shows no preview box until a constancia is chosen', async () => {
    montarRuta('/reep/constancias')
    await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    expect(screen.queryByRole('heading', { name: 'Vista previa' })).toBeNull()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/constancias')
    await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('sent mail screen', () => {
  it('shows a bounced address, corrects it and sends a «Reenvío por corrección»', async () => {
    const { user } = montarRuta('/reep/correos')
    await screen.findByRole('button', { name: 'Corregir y reenviar' })
    await user.click(screen.getByRole('button', { name: 'Corregir y reenviar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Corregir y reenviar' })
    const campo = within(dialogo).getByLabelText('Correo del par')
    await user.clear(campo)
    await user.type(campo, 'corregido@universidad.edu.co')
    await user.click(within(dialogo).getByRole('button', { name: 'Corregir y reenviar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await screen.findAllByText('Corregido y reenviado')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Reenvío por corrección').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Corregir y reenviar' })).toBeNull()
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

  it('Inicio summarises both journals, each card in its journal colours', async () => {
    const { container } = montarRuta('/inicio')
    await screen.findByRole('heading', { level: 1, name: 'Inicio' })
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Educación y Pedagogía' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Investigium IRE' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Pendiente' })).toBeInTheDocument()
    const tarjetas = [...container.querySelectorAll('section[data-revista]')]
    expect(tarjetas.map((t) => t.getAttribute('data-revista'))).toEqual(['reep', 'ire'])
  })
})

describe('reports', () => {
  it('shows the rejected articles of the period (RF-38)', async () => {
    montarRuta('/informes')
    expect(await screen.findByText('Rechazados')).toBeInTheDocument()
    expect(await screen.findByText('Artículos rechazados')).toBeInTheDocument()
  })

  it('generates the comparative report', async () => {
    montarRuta('/informes')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Informe de gestión' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: /Comparativo/i }),
    ).toBeInTheDocument()
  })

  it('the Auxiliar can open the reports too', async () => {
    montarRuta('/informes', AUXILIAR)
    expect(
      await screen.findByRole('heading', { level: 2, name: /Comparativo/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acceso restringido' })).toBeNull()
  })

  it('the journal filter says "Ambas" and the report is shown without a «Generar» button', async () => {
    montarRuta('/informes')
    expect(await screen.findByRole('combobox', { name: 'Revista' })).toHaveTextContent('Ambas')
    expect(screen.queryByRole('button', { name: 'Generar' })).toBeNull()
    expect(await screen.findByRole('button', { name: 'Exportar' })).toBeInTheDocument()
  })
})

describe('administration', () => {
  it('Configuración shows 5 waiting days and saves a new value', async () => {
    const { user } = montarRuta('/administracion/configuracion')
    await screen.findByRole('heading', { level: 2, name: 'Configuración' })
    const campo = await screen.findByLabelText('Días de espera de la respuesta del par')
    await waitFor(() => expect(campo).toHaveValue(5))
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    await user.clear(campo)
    await user.type(campo, '0')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Mínimo 1 día.')).toBeInTheDocument()

    await user.clear(campo)
    await user.type(campo, '7')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Configuración guardada.')).toBeInTheDocument()
    expect(campo).toHaveValue(7)
  })

  it('rejects a constancia template with an unknown marker and shows the error', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await screen.findByRole('heading', { level: 2, name: 'Plantillas' })
    await user.click(await screen.findByRole('combobox', { name: 'Plantilla' }))
    await user.click(await screen.findByRole('option', { name: /^Constancia de participación/ }))
    const texto = await screen.findByLabelText('Texto')
    await user.clear(texto)
    await user.type(texto, 'HACE CONSTAR QUE [[Número de la solicitud] evaluó.')
    await user.click(screen.getByRole('button', { name: 'Guardar plantilla' }))
    expect(await screen.findByText(/no se puede usar en esta plantilla/)).toBeInTheDocument()
    expect(screen.queryByText(/Plantilla guardada/)).toBeNull()
  })

  it('each journal has its own templates; the constancia shows its header, footer and signature', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('combobox', { name: 'Plantilla' }))
    await user.click(await screen.findByRole('option', { name: /^Constancia de participación/ }))
    expect(await screen.findByRole('heading', { name: 'Encabezado, pie de página y firma' })).toBeInTheDocument()
    expect(screen.getByLabelText('Imagen de encabezado')).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,.png,.jpg,.jpeg',
    )
    expect(screen.getByRole('button', { name: 'Ver archivo en PDF' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Revista' }))
    await user.click(await screen.findByRole('option', { name: 'Investigium IRE' }))
    await user.click(screen.getByRole('combobox', { name: 'Plantilla' }))
    await user.click(await screen.findByRole('option', { name: /^Constancia de participación/ }))
    expect(await screen.findByRole('heading', { name: 'Encabezado, pie de página y firma' })).toBeInTheDocument()
    // The preview is the PDF itself, in a viewer inside the page
    expect(await screen.findByRole('heading', { name: 'Vista previa de la constancia' })).toBeInTheDocument()
  })

  it('the preview of a mail template is the mail itself, with its header, not a plain text', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    expect(await screen.findByRole('heading', { name: 'Vista previa del correo' })).toBeInTheDocument()
    const marco = await screen.findByTitle('Vista previa del correo')
    expect(marco.tagName).toBe('IFRAME')
    expect(marco).toHaveAttribute('srcdoc', expect.stringContaining('Universidad CESMAG'))
    // it follows the text being edited
    const texto = screen.getByLabelText('Texto')
    await user.clear(texto)
    await user.type(texto, 'Un texto nuevo para la invitación.')
    await waitFor(() => expect(screen.getByTitle('Vista previa del correo')).toHaveAttribute('srcdoc', expect.stringContaining('Un texto nuevo')))
  })

  it('shows only the templates: no sender account box and no credentials', async () => {
    montarRuta('/administracion/plantillas')
    await screen.findByRole('combobox', { name: 'Plantilla' })
    expect(screen.queryByRole('heading', { name: /Cuenta remitente/ })).toBeNull()
    expect(screen.queryByDisplayValue('editorial.eyp@gmail.com')).toBeNull()
    expect(screen.queryByLabelText(/contraseña/i)).toBeNull()
  })

  it('creates a new template without a use, and the Administradora can delete it', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva plantilla' })
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    expect(
      await within(dialogo).findByText('Escriba el nombre de la plantilla.'),
    ).toBeInTheDocument()
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Invitación en inglés')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const lista = await screen.findByRole('combobox', { name: 'Plantilla' })
    await waitFor(() => expect(lista).toHaveTextContent('Invitación en inglés'))
    // a new template is blank: the person writes it
    expect(screen.getByLabelText('Texto').textContent).toBe('')
    expect(screen.getByText(/Sin uso asignado/)).toBeInTheDocument()
    expect(screen.queryByText('Invitación en inglés (en uso', { exact: false })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Eliminar plantilla' }))
    const confirmar = await screen.findByRole('dialog', { name: 'Eliminar plantilla' })
    await user.click(within(confirmar).getByRole('button', { name: 'Eliminar plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Plantilla' })).not.toHaveTextContent('Invitación en inglés'))
  })

  it('a new template is blank, has no «use now» option, and the data are inserted with a button', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva plantilla' })
    expect(within(dialogo).queryByRole('checkbox')).toBeNull()
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Invitación renovada')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText(/Sin uso asignado/)).toBeInTheDocument()

    const texto = screen.getByLabelText('Texto')
    expect(texto.textContent).toBe('')
    await user.click(screen.getByRole('button', { name: 'Universidad del par' }))
    expect(texto.textContent).toBe('[Universidad del par]')
    await user.click(screen.getByRole('button', { name: 'Nombre del par' }))
    expect(texto.textContent).toBe('[Universidad del par][Nombre del par]')
    // the preview is the mail with its frame, still without text
    const marco = await screen.findByTitle('Vista previa del correo')
    expect(marco).toHaveAttribute('srcdoc', expect.stringContaining('Universidad CESMAG'))
  })

  it('Configuración lets the Administradora choose which template each use takes', async () => {
    const { user } = montarRuta('/administracion/configuracion')
    await user.click(await screen.findByRole('tab', { name: 'Constancias' }))
    expect(
      await screen.findByRole('combobox', { name: /Constancia de participación de Educación/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByLabelText(/ISSN de/)).toHaveLength(2)
  })

  it('a new account receives the link to define its password (RF-40)', async () => {
    const { user } = montarRuta('/administracion/usuarios')
    await user.click(await screen.findByRole('button', { name: 'Crear usuario' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Crear usuario' })
    expect(within(dialogo).queryByLabelText(/contraseña/i)).toBeNull()
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Laura Peña')
    await user.type(
      within(dialogo).getByLabelText('Correo institucional'),
      'laura.pena@unicesmag.edu.co',
    )
    await user.click(within(dialogo).getByRole('button', { name: 'Crear usuario' }))
    expect(
      await screen.findByText(
        'Se envió a laura.pena@unicesmag.edu.co el enlace para definir la contraseña.',
      ),
    ).toBeInTheDocument()
    // The link goes in the mail to the new user, never on this screen
    expect(screen.queryByRole('link', { name: /Demostración/ })).toBeNull()

    // While the account has not entered, the link can be sent again
    await user.click(await screen.findByRole('button', { name: 'Editar a Laura Peña' }))
    const edicion = await screen.findByRole('dialog', { name: 'Editar usuario' })
    await user.click(within(edicion).getByRole('button', { name: 'Reenviar enlace' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      await screen.findByText(
        'Se envió a laura.pena@unicesmag.edu.co el enlace para definir la contraseña.',
      ),
    ).toBeInTheDocument()
  })

  it('the audit filter offers the action types of the data model (D13)', async () => {
    const { user } = montarRuta('/administracion/auditoria')
    await user.click(await screen.findByRole('combobox', { name: 'Tipo de acción' }))
    for (const tipo of [
      'Respuesta del par',
      'Envío de correo',
      'Desbloqueo',
      'Cambio de revista',
      'Cierre del proceso',
      'Migración',
      'Eliminación',
    ]) {
      expect(await screen.findByRole('option', { name: tipo })).toBeInTheDocument()
    }
  })

  it('the audit log shows the two journals and can be filtered by journal', async () => {
    const { user } = montarRuta('/administracion/auditoria')
    expect(await screen.findByText(/acciones registradas en ambas revistas/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Revista' }))
    await user.click(await screen.findByRole('option', { name: 'Investigium IRE' }))
    await waitFor(() => {
      const tabla = screen.getByRole('table')
      const filas = within(tabla).getAllByRole('row').slice(1)
      expect(filas.length).toBeGreaterThan(0)
      expect(filas.every((f) => /Investigium IRE/.test(f.textContent ?? ''))).toBe(true)
    })
  })

  it('the Auxiliar cannot open administration and does not see it in the side panel', async () => {
    montarRuta('/administracion/usuarios', AUXILIAR)
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Usuarios/ })).toBeNull())
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).queryByRole('link', { name: 'Administración' })).toBeNull()
    expect(within(nav).getByRole('link', { name: 'Informes' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toBeInTheDocument()
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
