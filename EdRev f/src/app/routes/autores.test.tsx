import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'

const TOTAL = /^50 autores · directorio común de ambas revistas$/

describe('authors (/:revista/autores) — common directory', () => {
  it('lists the authors of both journals with their journals and article counts', async () => {
    montarRuta('/reep/autores')
    expect(await screen.findByText(TOTAL)).toBeInTheDocument()
    const tabla = await screen.findByRole('table', { name: 'Directorio de autores' })
    const fila = within(tabla).getByText('Sandra Milena Córdoba').closest('tr') as HTMLElement
    expect(within(fila).getByText('3')).toBeInTheDocument()
    expect(within(fila).getByText('Educación y Pedagogía')).toBeInTheDocument()
    expect(within(tabla).getByText('Carlos Andrés Jurado')).toBeInTheDocument()
  })

  it('searches by name and by ORCID', async () => {
    const { user } = montarRuta('/reep/autores')
    await screen.findByText(TOTAL)
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre u ORCID' }),
      '0000-0003-2210-8876',
    )
    await waitFor(() => {
      const tabla = screen.getByRole('table', { name: 'Directorio de autores' })
      expect(within(tabla).getByText('Diego Fernando Erazo')).toBeInTheDocument()
      expect(within(tabla).queryByText('Sandra Milena Córdoba')).toBeNull()
    })
  })

  it('filters the directory by journal', async () => {
    const { user } = montarRuta('/reep/autores')
    await screen.findByText(TOTAL)
    await elegirOpcion(user, 'Revista', 'Investigium IRE')
    expect(await screen.findByText(/^25 autores/)).toBeInTheDocument()
    const tabla = screen.getByRole('table', { name: 'Directorio de autores' })
    expect(within(tabla).getByText('Carlos Andrés Jurado')).toBeInTheDocument()
    expect(within(tabla).queryByText('Sandra Milena Córdoba')).toBeNull()
  })

  it('a click on an author opens its own screen with its articles and a way back', async () => {
    const { user, router } = montarRuta('/reep/autores')
    await user.click(
      await screen.findByRole('link', { name: 'Ver la ficha de Sandra Milena Córdoba' }),
    )
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sandra Milena Córdoba' }),
    ).toBeInTheDocument()
    const tabla = await screen.findByRole('table', { name: 'Artículos de Sandra Milena Córdoba' })
    expect(within(tabla).getAllByRole('link')).toHaveLength(3)
    expect(
      within(tabla).getByRole('link', {
        name: 'Abrir el artículo 2026-034 de Educación y Pedagogía',
      }),
    ).toHaveAttribute('href', '/reep/articulos/2026-034')

    await user.click(screen.getByRole('link', { name: /Volver a autores/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/autores'))
  })

  it('registers an author (and refuses an ORCID already in the directory)', async () => {
    const { user, router } = montarRuta('/reep/autores')
    await user.click(await screen.findByRole('button', { name: 'Registrar autor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Registrar autor' })
    await user.type(within(dialogo).getByLabelText('Nombre completo'), 'Laura Sofía Rivera')
    await user.type(
      within(dialogo).getByLabelText('Correo electrónico'),
      'laura.rivera@umariana.edu.co',
    )
    await user.type(within(dialogo).getByLabelText('ORCID'), '0000-0002-4471-1188')
    await user.type(within(dialogo).getByLabelText('Filiación'), 'Universidad Mariana')
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar autor' }))
    expect(
      await within(dialogo).findByText('Ya existe un autor con ese ORCID en el directorio'),
    ).toBeInTheDocument()

    const orcid = within(dialogo).getByLabelText('ORCID')
    await user.clear(orcid)
    await user.type(orcid, '0000-0001-2345-6789')
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar autor' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/reep\/autores\/.+/))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Laura Sofía Rivera' }),
    ).toBeInTheDocument()
  })

  it('the Auxiliar can register authors', async () => {
    montarRuta('/reep/autores', AUXILIAR)
    expect(await screen.findByRole('button', { name: 'Registrar autor' })).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/autores')
    await screen.findByText(TOTAL)
    await screen.findByText('Sandra Milena Córdoba')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the author screen has no accessibility violations', async () => {
    const { container } = montarRuta('/ire/autores/ire-au-1')
    await screen.findByRole('heading', { level: 1 })
    await screen.findByRole('table', { name: /^Artículos de/ })
    expect(await axe(container)).toHaveNoViolations()
  })
})
