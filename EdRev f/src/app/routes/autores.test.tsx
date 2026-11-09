import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { montarRuta } from '@/test/montarRuta'

describe('authors (/:revista/autores)', () => {
  it('lists the journal reusable author records with their article counts', async () => {
    montarRuta('/reep/autores')
    expect(await screen.findByText('25 fichas reutilizables')).toBeInTheDocument()
    const tabla = await screen.findByRole('table', { name: 'Fichas de autor de la revista' })
    const fila = within(tabla).getByText('Sandra Milena Córdoba').closest('tr') as HTMLElement
    expect(within(fila).getByText('3')).toBeInTheDocument()
  })

  it('searches by name and by ORCID', async () => {
    const { user } = montarRuta('/reep/autores')
    await screen.findByText('25 fichas reutilizables')
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre u ORCID' }),
      '0000-0003-2210-8876',
    )
    await waitFor(() => {
      const tabla = screen.getByRole('table', { name: 'Fichas de autor de la revista' })
      expect(within(tabla).getByText('Diego Fernando Erazo')).toBeInTheDocument()
      expect(within(tabla).queryByText('Sandra Milena Córdoba')).toBeNull()
    })
  })

  it('shows the articles of the selected author, each linking to its sheet', async () => {
    const { user } = montarRuta('/reep/autores')
    await user.click(
      await screen.findByRole('button', { name: /Ver los artículos de Sandra Milena Córdoba/ }),
    )
    const tabla = await screen.findByRole('table', { name: 'Artículos de Sandra Milena Córdoba' })
    expect(within(tabla).getAllByRole('link')).toHaveLength(3)
    expect(within(tabla).getByRole('link', { name: 'Abrir el artículo 2026-034' })).toHaveAttribute(
      'href',
      '/reep/articulos/2026-034',
    )
  })

  it('never shows authors of the other journal', async () => {
    montarRuta('/ire/autores')
    expect(await screen.findByText('25 fichas reutilizables')).toBeInTheDocument()
    expect(await screen.findByText('Carlos Andrés Jurado')).toBeInTheDocument()
    expect(screen.queryByText('Sandra Milena Córdoba')).toBeNull()
  })

  it('registers an author (and refuses a repeated ORCID)', async () => {
    const { user } = montarRuta('/reep/autores')
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
      await within(dialogo).findByText('Ya existe un autor con ese ORCID en esta revista'),
    ).toBeInTheDocument()

    const orcid = within(dialogo).getByLabelText('ORCID')
    await user.clear(orcid)
    await user.type(orcid, '0000-0001-2345-6789')
    await user.click(within(dialogo).getByRole('button', { name: 'Registrar autor' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('26 fichas reutilizables')).toBeInTheDocument()
  })

  it('the Auxiliar can register authors', async () => {
    montarRuta('/reep/autores', AUXILIAR)
    expect(await screen.findByRole('button', { name: 'Registrar autor' })).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/autores')
    await screen.findByText('25 fichas reutilizables')
    await screen.findByText('Sandra Milena Córdoba')
    expect(await axe(container)).toHaveNoViolations()
  })
})
