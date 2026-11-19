/*
 * Phase 10 — final review: accessibility of every main screen with its data loaded, the menu on
 * small screens, and the whole flow of an article from its registration to the constancia.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'

const PANTALLAS = [
  '/inicio',
  '/informes',
  '/reep/tablero',
  '/reep/articulos',
  '/reep/articulos/nuevo',
  '/reep/articulos/2026-034',
  '/reep/articulos/2026-034/comite',
  '/reep/articulos/2026-034/autores',
  '/reep/articulos/2026-034/pares',
  '/reep/articulos/2026-034/historial',
  '/autores',
  '/pares',
  '/pares/bloqueados',
  '/pares/reep-par-1',
  '/reep/constancias',
  '/reep/correos',
  '/reep/por-corregir',
  '/administracion/usuarios',
  '/administracion/plantillas',
  '/administracion/auditoria',
]

describe('accessibility of every main screen (RNF-11)', () => {
  it.each(PANTALLAS)('%s has no violations once its data is loaded', async (ruta) => {
    const { container } = montarRuta(ruta)
    await screen.findAllByRole('heading', { level: 1 })
    await new Promise((r) => setTimeout(r, 400))
    // The previews are frames (the mail, the PDF): axe cannot enter them in jsdom, and they are not the page.
    expect(await axe(container, { iframes: false })).toHaveNoViolations()
  })
})

describe('small screens (RNF-10)', () => {
  it('«Menú» opens the side panel as a drawer and it closes when navigating', async () => {
    const { user, router } = montarRuta('/reep/tablero')
    await user.click(await screen.findByRole('button', { name: 'Menú' }))
    const menu = await screen.findByRole('dialog', { name: 'Menú principal' })
    await user.click(within(menu).getByRole('link', { name: 'Artículos' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/articulos'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('the whole flow of an article (HU-01, HU-03, HU-13, HU-14, HU-17, HU-22)', () => {
  it('register → committee approves → new candidate invited → accepts → delivers → constancia', async () => {
    const { user, router } = montarRuta('/reep/articulos/nuevo')

    // 1. Registration: data and an author of the common directory
    await user.type(await screen.findByLabelText('Número de OJS'), '2026-090')
    await user.type(screen.getByLabelText('Título'), 'Escuela rural y memoria')
    await elegirOpcion(user, 'Tipo de artículo', 'Investigación')
    await user.type(screen.getByLabelText('Buscar ficha existente'), 'Sandra')
    await user.click(await screen.findByRole('button', { name: /Sandra Milena Córdoba/ }))
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    await user.click(screen.getByRole('button', { name: 'Guardar artículo' }))

    // 2. Committee review with the anti-plagiarism report: approved
    await screen.findByRole('heading', { name: 'Ronda 1 de la revisión del comité' })
    await user.type(screen.getByLabelText('Coincidencias (%)'), '9')
    await user.type(screen.getByLabelText('Atribuido a IA (%)'), '2')
    await elegirOpcion(user, 'Resultado del comité', 'Aprobado')
    await user.click(screen.getByRole('button', { name: 'Guardar ronda' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/\/pares$/))

    // 3. Assignment: a brand-new candidate receives the invitation
    const panel = await screen.findByRole('region', { name: 'Asignar par evaluador' })
    await user.click(within(panel).getByRole('tab', { name: 'Registrar un candidato nuevo' }))
    await user.type(within(panel).getByLabelText('Nombre'), 'Marta Lucía Gómez')
    await user.type(within(panel).getByLabelText('Profesión o título'), 'Magíster en Educación')
    await user.type(within(panel).getByLabelText('Correo electrónico'), 'ml.gomez@udenar.edu.co')
    await user.type(within(panel).getByLabelText('Universidad'), 'Universidad Externa de Prueba')
    await user.type(within(panel).getByLabelText('Área temática'), 'Educación rural')
    await user.click(within(panel).getByRole('button', { name: 'Registrar y enviar invitación' }))
    expect(await screen.findByText('Par asignado e invitación enviada')).toBeInTheDocument()

    // 4. The peer accepts: the article goes to «En evaluación»
    await user.click(
      await screen.findByRole('button', { name: /Registrar respuesta de Marta Lucía Gómez/ }),
    )
    const respuesta = await screen.findByRole('dialog', { name: 'Respuesta del par' })
    await user.click(within(respuesta).getByRole('button', { name: 'Registrar respuesta' }))
    expect((await screen.findAllByText('En evaluación')).length).toBeGreaterThan(0)

    // 5. Delivery, and the constancia right away
    await user.click(
      await screen.findByRole('button', { name: /Marcar entrega de Marta Lucía Gómez/ }),
    )
    const entrega = await screen.findByRole('dialog', { name: 'Marcar entrega' })
    await elegirOpcion(user, 'Concepto', 'Publicable')
    await user.click(within(entrega).getByRole('button', { name: 'Marcar entrega' }))
    const constancia = await screen.findByRole('dialog', {
      name: 'Emitir la constancia de Marta Lucía Gómez',
    })
    await within(constancia).findByText(/CERTIFICA QUE/)
    await user.click(within(constancia).getByRole('button', { name: 'Emitir y enviar' }))
    expect(await screen.findByText('Constancia enviada a Marta Lucía Gómez.')).toBeInTheDocument()
  })
})
