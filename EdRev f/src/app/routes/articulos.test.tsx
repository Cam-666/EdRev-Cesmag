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

  it('filters by postulation date range and shows the empty state', async () => {
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

describe('article registration (one form, then the committee review)', () => {
  it('validates required fields', async () => {
    const { user } = montarRuta('/reep/articulos/nuevo')
    await user.click(await screen.findByRole('button', { name: 'Guardar artículo' }))
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

  it('registers data and authors in one form and opens the committee review to fill', async () => {
    const { user, router } = montarRuta('/reep/articulos/nuevo')
    expect(await screen.findByRole('link', { name: /Volver a artículos/ })).toHaveAttribute(
      'href',
      '/reep/articulos',
    )

    await user.type(await screen.findByLabelText('Número de OJS'), '2026-035')
    await user.type(screen.getByLabelText('Título'), 'Narrativas docentes e identidad profesional')
    await elegirOpcion(user, 'Tipo de artículo', 'Investigación')

    // Guardar sin autores se rechaza
    await user.click(screen.getByRole('button', { name: 'Guardar artículo' }))
    expect(await screen.findByText(/Agregue al menos un autor/)).toBeInTheDocument()

    // Autor existente del directorio común: se busca por nombre, los datos se llenan y quedan de solo lectura
    await user.type(screen.getByLabelText('Buscar ficha existente'), 'Sandra')
    await user.click(await screen.findByRole('button', { name: /Sandra Milena Córdoba/ }))
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Sandra Milena Córdoba')
    expect(screen.getByLabelText('ORCID (opcional)')).toHaveAttribute('readonly')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('1 de 7')).toBeInTheDocument()
    expect(screen.getByText('Principal')).toBeInTheDocument()

    // Un autor nuevo
    await user.type(screen.getByLabelText('Nombre completo'), 'Laura Sofía Rivera')
    await user.type(screen.getByLabelText('Correo electrónico'), 'laura.rivera@umariana.edu.co')
    await user.type(screen.getByLabelText('ORCID (opcional)'), '0000-0001-2345-6789')
    await user.type(screen.getByLabelText('Filiación'), 'Universidad Mariana')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('2 de 7')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar artículo' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/2026-035/comite'),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: /2026-035 · Narrativas docentes/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Postulado').length).toBeGreaterThan(0)
    expect(
      await screen.findByRole('heading', { name: 'Ronda 1 de la revisión del comité' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Coincidencias (%)')).toHaveValue('')
  })

  it('validates the author form (ORCID format) before adding', async () => {
    const { user } = montarRuta('/reep/articulos/nuevo')
    await user.type(await screen.findByLabelText('Nombre completo'), 'Alguien')
    await user.type(screen.getByLabelText('ORCID (opcional)'), '123')
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('Use el formato 0000-0000-0000-0000.')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/articulos/nuevo')
    await screen.findByLabelText('Número de OJS')
    expect(await axe(container)).toHaveNoViolations()
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
    expect(screen.getByRole('link', { name: 'Ver la revisión del comité' })).toHaveAttribute(
      'href',
      '/reep/articulos/2026-034/comite',
    )
    expect(screen.getByRole('link', { name: /Volver a artículos/ })).toBeInTheDocument()
  })

  it('does not warn when matches are within 15 %, whatever the AI percentage', async () => {
    montarRuta('/ire/articulos/2026-077')
    await screen.findByRole('heading', { level: 1, name: /2026-077/ })
    expect(screen.getByText('Antiplagio y comité editorial')).toBeInTheDocument()
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
    await user.type(within(agregar).getByLabelText('ORCID (opcional)'), '0000-0002-1111-2222')
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
      screen.getByText('Los conceptos de los dos primeros pares no coinciden.'),
    ).toBeInTheDocument()
  })

  it('Pares y evaluación does not show the notice when concepts agree', async () => {
    const { user } = montarRuta('/reep/articulos/2026-024')
    await user.click(await screen.findByRole('tab', { name: 'Pares y evaluación' }))
    await screen.findByRole('list', { name: 'Pares asignados' })
    expect(screen.queryByText(/no coinciden/)).toBeNull()
  })

  it('has no «Observaciones» tab: the sheet has five tabs', async () => {
    montarRuta('/reep/articulos/2026-034')
    const pestanas = await screen.findAllByRole('tab')
    expect(pestanas.map((t) => t.textContent)).toEqual([
      'Resumen',
      'Revisión del comité',
      'Autores',
      'Pares y evaluación',
      'Historial',
    ])
  })

  it('Historial shows mails with symbol + text result and who changed what', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034')
    await user.click(await screen.findByRole('tab', { name: 'Historial' }))
    const tabla = await screen.findByRole('table', { name: 'Correos enviados por este artículo' })
    expect(within(tabla).getByText('Rebotado')).toBeInTheDocument()
    expect(within(tabla).getAllByText('Enviado').length).toBeGreaterThan(0)
    expect(within(tabla).getAllByText('Agradecimiento').length).toBeGreaterThan(0)
    expect(screen.getByText('Cambios')).toBeInTheDocument()
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

  it('edits title, type and publication (volume and number together)', async () => {
    const { user } = montarRuta('/reep/articulos/2026-032')
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar artículo' })
    await user.type(within(dialogo).getByLabelText('Volumen'), '10')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await within(dialogo).findByText('Escriba el número junto con el volumen.'),
    ).toBeInTheDocument()
    await user.type(within(dialogo).getByLabelText('Número'), '2')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(
      await screen.findByText('Educación emocional y clima de aula', { exact: false }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/Reflexión · Vol\. 10 n\.º 2/)).toBeInTheDocument()
  })
})

describe('closing the process', () => {
  it('approving asks for the reason and the volume and number together', async () => {
    const { user } = montarRuta('/reep/articulos/2026-034')
    await user.click(await screen.findByRole('button', { name: 'Cerrar proceso' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar el proceso' })
    await elegirOpcion(user, 'Nuevo estado', 'Aprobado')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar el proceso' }))
    expect(await within(dialogo).findByText('Escriba el motivo del cierre.')).toBeInTheDocument()
    await user.type(within(dialogo).getByLabelText('Motivo'), 'Los pares lo consideran publicable.')
    // El artículo ya tenía Vol. 10 n.º 2: viene lleno; sin el volumen se rechaza
    const volumen = within(dialogo).getByLabelText('Volumen')
    expect(volumen).toHaveValue('10')
    await user.clear(volumen)
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar el proceso' }))
    expect(
      await within(dialogo).findByText('Escriba el volumen de la publicación.'),
    ).toBeInTheDocument()

    await user.type(volumen, '11')
    const numero = within(dialogo).getByLabelText('Número')
    await user.clear(numero)
    await user.type(numero, '1')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar el proceso' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await screen.findAllByText(/Vol\. 11 n\.º 1/)).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Cerrar proceso' })).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Historial' }))
    expect(
      await screen.findByText(/Cerró el proceso como Aprobado: Los pares lo consideran/),
    ).toBeInTheDocument()
  })

  it('archiving leaves the article ready to be reopened later', async () => {
    const { user } = montarRuta('/reep/articulos/2026-032')
    await user.click(await screen.findByRole('button', { name: 'Cerrar proceso' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar el proceso' })
    await elegirOpcion(user, 'Nuevo estado', 'Archivado')
    expect(within(dialogo).queryByLabelText('Volumen')).toBeNull()
    await user.type(within(dialogo).getByLabelText('Motivo'), 'El autor no respondió.')
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar el proceso' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect((await screen.findAllByText('Archivado')).length).toBeGreaterThan(0)
  })
})

describe('committee review (/comite)', () => {
  it('registers rounds with the anti-plagiarism report; the 15 % warning never blocks', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-023/comite')
    expect(await screen.findByText('Aún no hay rondas registradas.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar ronda' }))

    const coincidencias = await screen.findByLabelText('Coincidencias (%)')
    expect(coincidencias).toHaveValue('11')
    const ia = screen.getByLabelText('Atribuido a IA (%)')
    await user.clear(ia)
    await user.type(ia, '95')
    expect(screen.queryByText(/superan el 15 %/)).toBeNull()
    await user.clear(coincidencias)
    await user.type(coincidencias, '150')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    expect(await screen.findByText('Escriba un número entre 0 y 100.')).toBeInTheDocument()
    expect(screen.getByText('Seleccione el resultado del comité.')).toBeInTheDocument()

    // La página solo sugiere un resultado; lo elige el comité
    await user.clear(coincidencias)
    await user.type(coincidencias, '21')
    expect(
      await screen.findByText('Sugerencia: Rechazado (no publicable)'),
    ).toBeInTheDocument()
    expect(screen.getByText(/superan el 15 % aceptado/)).toBeInTheDocument()
    // dentro del límite y con observaciones la sugerencia cambia
    await user.clear(coincidencias)
    await user.type(coincidencias, '11')
    await user.type(screen.getByLabelText('Observaciones del comité'), 'Ajustar el método.')
    expect(
      await screen.findByText('Sugerencia: Requiere ajustes (publicable con observaciones)'),
    ).toBeInTheDocument()
    // nada se elige por el comité: la elección queda vacía hasta que escoja
    await elegirOpcion(user, 'Resultado del comité', 'Requiere ajustes')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    expect(await screen.findByText(/Ronda registrada: Requiere ajustes/)).toBeInTheDocument()
    const lista = screen.getByRole('list', { name: 'Rondas de la revisión del comité' })
    expect(within(lista).getByText('Ajustar el método.')).toBeInTheDocument()

    // Segunda ronda: aprobada, así que pasa directo a la asignación de pares
    await user.click(await screen.findByRole('button', { name: 'Registrar ronda' }))
    await screen.findByRole('heading', { name: 'Ronda 2 de la revisión del comité' })
    expect(await screen.findByText('Sugerencia: Aprobado (publicable)')).toBeInTheDocument()
    await elegirOpcion(user, 'Resultado del comité', 'Aprobado')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/reep/articulos/2026-023/pares'),
    )
    expect(router.state.location.search).toBe('?asignar=1')
  })

  it('a Rechazado round does not close the process; the committee can approve a later one even above the limit', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-026/comite')
    await user.click(await screen.findByRole('button', { name: 'Registrar ronda' }))
    const coincidencias = await screen.findByLabelText('Coincidencias (%)')
    await user.clear(coincidencias)
    await user.type(coincidencias, '40')
    const ia = screen.getByLabelText('Atribuido a IA (%)')
    await user.clear(ia)
    await user.type(ia, '1')
    await elegirOpcion(user, 'Resultado del comité', 'Rechazado')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    expect(await screen.findByText(/Ronda registrada: Rechazado/)).toBeInTheDocument()
    expect(screen.getByText(/El artículo sigue en revisión/)).toBeInTheDocument()
    // el proceso no se cierra: se puede registrar otra ronda
    expect(await screen.findByRole('button', { name: 'Registrar ronda' })).toBeInTheDocument()

    // el comité aprueba una ronda aunque el reporte no: pasa a los pares
    await user.click(screen.getByRole('button', { name: 'Registrar ronda' }))
    const otra = await screen.findByLabelText('Coincidencias (%)')
    await user.clear(otra)
    await user.type(otra, '70')
    expect(await screen.findByText('Sugerencia: Rechazado (no publicable)')).toBeInTheDocument()
    await elegirOpcion(user, 'Resultado del comité', 'Aprobado')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    await waitFor(() => expect(router.state.location.search).toBe('?asignar=1'))
  })

  it('shows every round, most recent first; no new rounds once the article has peers, but it can still change journal', async () => {
    montarRuta('/reep/articulos/2026-034/comite')
    const lista = await screen.findByRole('list', { name: 'Rondas de la revisión del comité' })
    const rondas = within(lista).getAllByRole('listitem')
    expect(rondas).toHaveLength(2)
    expect(within(rondas[0] as HTMLElement).getByText('Ronda 2')).toBeInTheDocument()
    expect(within(rondas[0] as HTMLElement).getByText('Aprobado')).toBeInTheDocument()
    expect(within(rondas[1] as HTMLElement).getByText('Requiere ajustes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar ronda' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Cambiar de revista' })).toBeInTheDocument()
  })

  it('changes an article in committee review to the other journal', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-021')
    await user.click(await screen.findByRole('button', { name: 'Cambiar de revista' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Cambiar a Investigium IRE' })
    await user.click(within(dialogo).getByRole('button', { name: 'Cambiar de revista' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/ire/articulos/2026-021/comite'),
    )
    expect(await screen.findByText(/ISSN: 2357-5239/)).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 1, name: /2026-021 · Formación docente/ }),
    ).toBeInTheDocument()
  })

  it('the Auxiliar can register rounds', async () => {
    montarRuta('/reep/articulos/2026-023/comite', AUXILIAR)
    expect(await screen.findByRole('button', { name: 'Registrar ronda' })).toBeInTheDocument()
  })

  it('has no accessibility violations with the form open', async () => {
    const { container } = montarRuta('/reep/articulos/2026-023/comite?registrar=1')
    await screen.findByRole('heading', { name: 'Ronda 1 de la revisión del comité' })
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('reopening an archived article (/reabrir)', () => {
  it('shows what is kept, requires a reason and records it in the history', async () => {
    const { user, router } = montarRuta('/reep/articulos/2026-007/reabrir')
    const dialogo = await screen.findByRole('dialog', { name: 'Retomar el proceso' })
    expect(within(dialogo).getByText(/Archivado el 30 de septiembre de 2026/)).toBeInTheDocument()
    expect(within(dialogo).getByText('Se conserva')).toBeInTheDocument()
    expect(within(dialogo).getByText('Ninguno asignado')).toBeInTheDocument()
    expect(within(dialogo).getByText('3')).toBeInTheDocument()

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
    // La navegación se confirma en una transición de baja prioridad: se espera a que el diálogo desaparezca.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 10000 })
    expect((await screen.findAllByText('Postulado')).length).toBeGreaterThan(0)

    await user.click(await screen.findByRole('tab', { name: 'Historial' }))
    expect(
      await screen.findByText(/Retomó el proceso: El autor escribió el 2 de noviembre/),
    ).toBeInTheDocument()
    // El historial anterior se conserva
    expect(screen.getByText('Archivó el artículo')).toBeInTheDocument()
  })

  it('is open to the Auxiliar profile', async () => {
    montarRuta('/reep/articulos/2026-007/reabrir', AUXILIAR)
    expect(await screen.findByRole('dialog', { name: 'Retomar el proceso' })).toBeInTheDocument()
  })

  it('explains that a non-archived article has nothing to resume', async () => {
    montarRuta('/reep/articulos/2026-034/reabrir')
    expect(await screen.findByText(/no está archivado/)).toBeInTheDocument()
  })
})
