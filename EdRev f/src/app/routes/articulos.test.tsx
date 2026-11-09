import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'

describe('article list (/:revista/articulos)', () => {
  it('shows the journal count, six rows per page and pagination', async () => {
    const { user } = montarRuta('/reep/articulos')
    expect(await screen.findByText('20 registrados')).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: 'Artículos de la revista' })
    expect(within(tabla).getAllByRole('link')).toHaveLength(6)
    expect(screen.getByText('1–6 de 20')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(await screen.findByText('7–12 de 20')).toBeInTheDocument()
  })

  it('never lists articles of the other journal', async () => {
    montarRuta('/ire/articulos')
    expect(await screen.findByText('20 registrados')).toBeInTheDocument()
    expect(screen.queryByText(/Alfabetización mediática/)).toBeNull()
    expect(
      screen.getAllByText(/Migración y redes de apoyo|Cooperativismo|Archivos orales/).length,
    ).toBeGreaterThan(0)
  })

  it('filters by status from the URL and each row is a link to its sheet', async () => {
    montarRuta('/reep/articulos?estado=aprobado')
    const enlace = await screen.findByRole('link', { name: 'Abrir el artículo 2026-024' })
    expect(enlace).toHaveAttribute('href', '/reep/articulos/2026-024')
    expect(screen.queryByRole('link', { name: 'Abrir el artículo 2026-034' })).toBeNull()
  })

  it('an archived row opens the "Retomar el proceso" dialog route', async () => {
    montarRuta('/reep/articulos?estado=archivado')
    const enlace = await screen.findByRole('link', { name: 'Abrir el artículo 2026-007' })
    expect(enlace).toHaveAttribute('href', '/reep/articulos/2026-007/reabrir')
  })

  it('filters by postulation date range (HU-26) and shows the empty state', async () => {
    montarRuta('/reep/articulos?desde=2026-10-25&hasta=2026-10-31')
    expect(
      await screen.findByRole('link', { name: 'Abrir el artículo 2026-033' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Abrir el artículo 2026-034' })).toBeNull()
  })

  it('searches by title without accents', async () => {
    const { user } = montarRuta('/reep/articulos')
    await screen.findByText('20 registrados')
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por título o número de OJS' }),
      'alfabetizacion',
    )
    expect(await screen.findByText('1 resultados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir el artículo 2026-034' })).toBeInTheDocument()
  })

  it('shows a message when nothing matches', async () => {
    montarRuta('/reep/articulos?q=zzzz')
    expect(await screen.findByText('Ningún artículo coincide con los filtros.')).toBeInTheDocument()
  })

  it('offers "Registrar artículo" to the Auxiliar too (they register data)', async () => {
    montarRuta('/reep/articulos', AUXILIAR)
    expect(await screen.findByRole('link', { name: 'Registrar artículo' })).toHaveAttribute(
      'href',
      '/reep/articulos/nuevo',
    )
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/articulos')
    await screen.findByText('20 registrados')
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('article registration in two steps', () => {
  it('step 1 validates required fields', async () => {
    const { user } = montarRuta('/reep/articulos/nuevo')
    await user.click(await screen.findByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Escriba el número de OJS.')).toBeInTheDocument()
    expect(screen.getByText('Escriba el título del artículo.')).toBeInTheDocument()
    expect(screen.getByText('Seleccione el tipo de artículo.')).toBeInTheDocument()
  })

  it('warns about a repeated OJS number within the journal without blocking, and not in the other', async () => {
    const { user, unmount } = montarRuta('/reep/articulos/nuevo')
    await user.type(await screen.findByLabelText('Número de OJS'), '2026-034')
    expect(
      await screen.findByText(/El número 2026-034 ya está registrado en esta revista/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver el artículo 2026-034/ })).toHaveAttribute(
      'href',
      '/reep/articulos/2026-034',
    )
    unmount()

    const ire = montarRuta('/ire/articulos/nuevo')
    await ire.user.type(await screen.findByLabelText('Número de OJS'), '2026-034')
    await waitFor(() => expect(screen.getByLabelText('Número de OJS')).toHaveValue('2026-034'))
    await new Promise((r) => setTimeout(r, 450))
    expect(screen.queryByText(/ya está registrado/)).toBeNull()
  })

  it('completes both steps, reusing an existing author, and opens the new sheet', async () => {
    const { user, router } = montarRuta('/reep/articulos/nuevo')

    await user.type(await screen.findByLabelText('Número de OJS'), '2026-035')
    await user.type(screen.getByLabelText('Título'), 'Narrativas docentes e identidad profesional')
    await elegirOpcion(user, 'Tipo de artículo', 'Investigación')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/nuevo/autores'),
    )
    expect(await screen.findByText('Paso 2 de 2 · 2026-035')).toBeInTheDocument()

    // Saving without authors is refused
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/Agregue al menos un autor/)).toBeInTheDocument()

    // Existing author record: search by name, data fills in and becomes read-only
    await user.type(screen.getByLabelText('Buscar ficha existente'), 'Sandra')
    await user.click(await screen.findByRole('button', { name: /Sandra Milena Córdoba/ }))
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Sandra Milena Córdoba')
    expect(screen.getByLabelText('ORCID')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('1 de 7')).toBeInTheDocument()
    expect(screen.getByText('Principal')).toBeInTheDocument()

    // A brand-new author
    await user.type(screen.getByLabelText('Nombre completo'), 'Laura Sofía Rivera')
    await user.type(screen.getByLabelText('Correo electrónico'), 'laura.rivera@umariana.edu.co')
    await user.type(screen.getByLabelText('ORCID'), '0000-0001-2345-6789')
    await user.type(screen.getByLabelText('Filiación'), 'Universidad Mariana')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('2 de 7')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/articulos/2026-035'))
    expect(
      await screen.findByRole('heading', { level: 1, name: /2026-035 · Narrativas docentes/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Postulado').length).toBeGreaterThan(0)
  })

  it('validates the author form (ORCID format) before adding', async () => {
    const { user } = montarRuta('/reep/articulos/nuevo')
    await user.type(await screen.findByLabelText('Número de OJS'), '2026-040')
    await user.type(screen.getByLabelText('Título'), 'Prueba')
    await elegirOpcion(user, 'Tipo de artículo', 'Revisión')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Paso 2 de 2 · 2026-040')

    await user.type(screen.getByLabelText('Nombre completo'), 'Alguien')
    await user.type(screen.getByLabelText('ORCID'), '123')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Use el formato 0000-0000-0000-0000.')).toBeInTheDocument()
  })
})

describe('article sheet', () => {
  it('shows the header, Resumen with the antiplagio warning that does not block', async () => {
    montarRuta('/reep/articulos/2026-034')
    expect(
      await screen.findByRole('heading', { level: 1, name: /2026-034 · Alfabetización mediática/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Antiplagio 21 %')).toBeInTheDocument()
    expect(screen.getByText('3 pares asignados')).toBeInTheDocument()
    expect(screen.getByText('Supera el 15 % aceptado. No bloquea el proceso.')).toBeInTheDocument()
    expect(screen.getByText('8 %')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar antiplagio y revisión' })).toBeInTheDocument()
  })

  it('does not warn when matches are within 15 %, whatever the AI percentage', async () => {
    montarRuta('/ire/articulos/2026-077')
    await screen.findByRole('heading', { level: 1, name: /2026-077/ })
    expect(screen.getByText('Dentro del 15 % aceptado por la dependencia.')).toBeInTheDocument()
    expect(screen.queryByText(/No bloquea el proceso/)).toBeNull()
  })

  it('Autores tab lists the authors in order with the main one', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034')
    await user.click(await screen.findByRole('tab', { name: 'Autores' }))
    expect(await screen.findByText('3 de 7')).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: 'Autores del artículo' })
    const filas = within(tabla).getAllByRole('row')
    expect(filas).toHaveLength(4)
    expect(within(filas[1] as HTMLElement).getByText('Sandra Milena Córdoba')).toBeInTheDocument()
    expect(within(filas[1] as HTMLElement).getByText('Principal')).toBeInTheDocument()
    expect(within(filas[2] as HTMLElement).getByText('--')).toBeInTheDocument()
  })

  it('Autores tab: edits an author record and adds another author', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034/autores')
    await user.click(await screen.findByRole('button', { name: /Editar a Diego Fernando Erazo/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar autor' })
    const filiacion = within(dialogo).getByLabelText('Filiación')
    await user.clear(filiacion)
    await user.type(filiacion, 'Universidad CESMAG, Pasto')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Universidad CESMAG, Pasto')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Agregar autor' }))
    const agregar = await screen.findByRole('dialog', { name: 'Agregar autor' })
    await user.type(within(agregar).getByLabelText('Nombre completo'), 'Pedro Pablo Rojas')
    await user.type(
      within(agregar).getByLabelText('Correo electrónico'),
      'pedro.rojas@udenar.edu.co',
    )
    await user.type(within(agregar).getByLabelText('ORCID'), '0000-0002-1111-2222')
    await user.type(within(agregar).getByLabelText('Filiación'), 'Universidad de Nariño')
    await user.click(within(agregar).getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('4 de 7')).toBeInTheDocument()
  })

  it('Pares y evaluación shows order, tiebreaker, concepts and the contradiction notice', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034')
    await user.click(await screen.findByRole('tab', { name: 'Pares y evaluación' }))
    const lista = await screen.findByRole('list', { name: 'Pares asignados' })
    const items = within(lista).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0] as HTMLElement).getByText('Luz Marina Burbano')).toBeInTheDocument()
    expect(within(items[0] as HTMLElement).getByText('Publicable')).toBeInTheDocument()
    expect(within(items[1] as HTMLElement).getByText('No publicable')).toBeInTheDocument()
    expect(within(items[2] as HTMLElement).getByText('Desempate')).toBeInTheDocument()
    expect(
      screen.getByText('Los conceptos de los dos primeros pares se contradicen.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Cómo se resuelve')).toBeInTheDocument()
  })

  it('Pares y evaluación does not show the notice when concepts agree', async () => {
    const { user } = montarRuta('/reep/articulos/2026-024')
    await user.click(await screen.findByRole('tab', { name: 'Pares y evaluación' }))
    await screen.findByRole('list', { name: 'Pares asignados' })
    expect(screen.queryByText(/se contradicen/)).toBeNull()
  })

  it('Observaciones: newest first and a new one is added without overwriting', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034/observaciones')
    const lista = await screen.findByRole('list', { name: 'Observaciones registradas' })
    const antes = within(lista).getAllByRole('listitem')
    expect(antes).toHaveLength(3)
    expect(within(antes[0] as HTMLElement).getByText(/Conceptos divergentes/)).toBeInTheDocument()
    expect(
      within(antes[0] as HTMLElement).getByText(/28 oct · 15:40 · Ma\. C\. Mendoza/),
    ).toBeInTheDocument()

    expect(screen.getByText(/Se registrará como Ma\. Camila Mendoza/)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText('Escribir una observación'),
      'El autor solicitó ocho días de prórroga.',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: 'Observaciones registradas' })).getAllByRole(
          'listitem',
        ),
      ).toHaveLength(4),
    )
    const despues = within(
      screen.getByRole('list', { name: 'Observaciones registradas' }),
    ).getAllByRole('listitem')
    expect(
      within(despues[0] as HTMLElement).getByText('El autor solicitó ocho días de prórroga.'),
    ).toBeInTheDocument()
    expect(within(despues[1] as HTMLElement).getByText(/Conceptos divergentes/)).toBeInTheDocument()
  })

  it('Observaciones: refuses an empty note', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034/observaciones')
    await user.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Escriba la observación.')).toBeInTheDocument()
  })

  it('Historial shows mails with symbol + text result and who changed what', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034')
    await user.click(await screen.findByRole('tab', { name: 'Historial' }))
    const tabla = await screen.findByRole('table', { name: 'Correos enviados por este artículo' })
    expect(within(tabla).getByText('Rebotado')).toBeInTheDocument()
    expect(within(tabla).getAllByText('Entregado').length).toBeGreaterThan(0)
    expect(within(tabla).getAllByText('Agradecimiento con constancia').length).toBeGreaterThan(0)
    expect(screen.getByText('Quién cambió qué')).toBeInTheDocument()
    expect(screen.getByText('Asignó el par 3 como desempate')).toBeInTheDocument()
  })

  it('an article of the other journal is not found', async () => {
    montarRuta('/ire/articulos/2026-034')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Artículo no encontrado' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al listado' })).toHaveAttribute(
      'href',
      '/ire/articulos',
    )
  })

  it('edits title, type and publication number', async () => {
    const { user } = montarRuta('/reep/articulos/2026-032')
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar artículo' })
    await user.type(within(dialogo).getByLabelText('Nº de publicación'), 'Vol. 10 n.º 2')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      await screen.findByText('Educación emocional y clima de aula', { exact: false }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Reflexión · Vol\. 10 n\.º 2/)).toBeInTheDocument()
  })
})

describe('anti-plagiarism and committee review (/antiplagio)', () => {
  it('warns next to the field above 15 % without blocking, and never for the AI percentage', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034/antiplagio')
    const coincidencias = await screen.findByLabelText('Coincidencias (%)')
    await user.clear(coincidencias)
    await user.type(coincidencias, '9')
    expect(screen.getByText(/están dentro del 15 % aceptado/)).toBeInTheDocument()

    const ia = screen.getByLabelText('Atribuido a IA (%)')
    await user.clear(ia)
    await user.type(ia, '95')
    expect(screen.queryByText(/superan el 15 %/)).toBeNull()
    expect(screen.getByText('No es causal de rechazo.')).toBeInTheDocument()

    await user.clear(coincidencias)
    await user.type(coincidencias, '21')
    expect(
      screen.getByText(/superan el 15 % aceptado\. No bloquea el proceso\./),
    ).toBeInTheDocument()
  })

  it('validates the percentages and saves even above the threshold', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-034/antiplagio')
    const coincidencias = await screen.findByLabelText('Coincidencias (%)')
    await user.clear(coincidencias)
    await user.type(coincidencias, '150')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Escriba un número entre 0 y 100.')).toBeInTheDocument()

    await user.clear(coincidencias)
    await user.type(coincidencias, '18')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/articulos/2026-034'))
    expect(await screen.findByText('Antiplagio 18 %')).toBeInTheDocument()
  })

  it('registers the committee review from the closed list and moves a screened article', async () => {
    const { user } = montarRuta('/reep/articulos/2026-023/antiplagio')
    await screen.findByLabelText('Coincidencias (%)')
    await elegirOpcion(user, 'Resultado', 'Pasa a pares evaluadores')
    await user.type(
      screen.getByLabelText('Observación del comité'),
      'Cumple los criterios de la revista.',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByRole('heading', { level: 1, name: /2026-023/ })
    expect((await screen.findAllByText('En evaluación')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pasa a pares evaluadores').length).toBeGreaterThan(0)
  })

  it('lists what was registered before', async () => {
    montarRuta('/reep/articulos/2026-034/antiplagio')
    expect(await screen.findByText('Registrado antes')).toBeInTheDocument()
    expect(screen.getByText('Antiplagio: 21 % y 8 %.')).toBeInTheDocument()
  })

  it('is closed to the Auxiliar profile', async () => {
    montarRuta('/reep/articulos/2026-034/antiplagio', AUXILIAR)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Acceso restringido' }),
    ).toBeInTheDocument()
  })
})

describe('reopening an archived article (/reabrir)', () => {
  it('shows what is kept, requires a reason and records it as an observation', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-007/reabrir')
    const dialogo = await screen.findByRole('dialog', { name: 'Retomar el proceso' })
    expect(within(dialogo).getByText(/Archivado el 30 de septiembre de 2026/)).toBeInTheDocument()
    expect(within(dialogo).getByText('Se conserva')).toBeInTheDocument()
    expect(within(dialogo).getByText('Ninguno asignado')).toBeInTheDocument()
    expect(within(dialogo).getByText('3 con su ORCID')).toBeInTheDocument()

    await user.click(within(dialogo).getByRole('button', { name: 'Retomar' }))
    expect(
      await within(dialogo).findByText('Escriba el motivo de la reapertura.'),
    ).toBeInTheDocument()

    await user.type(
      within(dialogo).getByLabelText('Motivo de la reapertura'),
      'El autor escribió el 2 de noviembre anunciando las modificaciones.',
    )
    await user.click(within(dialogo).getByRole('button', { name: 'Retomar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/articulos/2026-007'))
    // The navigation commits in a low-priority transition: wait for the dialog to be gone.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 10000 })
    expect((await screen.findAllByText('En revisión')).length).toBeGreaterThan(0)

    await user.click(await screen.findByRole('tab', { name: 'Observaciones' }))
    expect(
      await screen.findByText(/Se retomó el proceso: El autor escribió el 2 de noviembre/),
    ).toBeInTheDocument()
    // The earlier history is kept: the three older observations are still there
    expect(screen.getByText('Se solicitaron modificaciones al autor.')).toBeInTheDocument()
  })

  it('is closed to the Auxiliar profile', async () => {
    montarRuta('/reep/articulos/2026-007/reabrir', AUXILIAR)
    expect(await screen.findByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('explains that a non-archived article has nothing to resume', async () => {
    montarRuta('/reep/articulos/2026-034/reabrir')
    expect(await screen.findByText(/no está archivado/)).toBeInTheDocument()
  })
})
