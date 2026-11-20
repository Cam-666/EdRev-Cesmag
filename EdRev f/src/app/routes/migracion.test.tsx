import { screen, waitFor, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { montarRuta } from '@/test/montarRuta'

describe('migrated records to correct (/:revista/por-corregir)', () => {
  it('the dashboard announces them and opens the list', async () => {
    const { user, router } = montarRuta('/reep/tablero')
    expect(await screen.findByText('Registros migrados por corregir')).toBeInTheDocument()
    expect(
      screen.getByText('3 registros del Excel no encajan en las listas del sistema.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Corregir' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reep/por-corregir'))
    const tabla = await screen.findByRole('table', { name: 'Registros migrados por corregir' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(4)
    expect(within(tabla).getByText('«Artículo corto»')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Volver al tablero/ })).toBeInTheDocument()
  })

  it('corrects a type from its closed list and the record leaves the list', async () => {
    const { user } = montarRuta('/reep/por-corregir', AUXILIAR)
    const tabla = await screen.findByRole('table', { name: 'Registros migrados por corregir' })
    const guardar = await within(tabla).findByRole('button', {
      name: /Guardar la corrección de 2024-018/,
    })
    await user.click(guardar)
    expect(await screen.findByText('Elija el valor correcto.')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /Tipo de artículo de 2024-018/ }))
    await user.click(await screen.findByRole('option', { name: 'Reflexión' }))
    await user.click(guardar)
    expect(await screen.findByText(/Se corrigió tipo de artículo de 2024-018/)).toBeInTheDocument()
    await waitFor(() => expect(within(tabla).queryByText('«Artículo corto»')).toBeNull())
    expect(screen.getByText('2 registros del Excel por corregir')).toBeInTheDocument()
  })

  it('asks the email of a peer the Excel brought without it', async () => {
    const { user } = montarRuta('/ire/por-corregir')
    const campo = await screen.findByLabelText(/Correo del par de/)
    await user.type(campo, 'sin-arroba')
    await user.click(screen.getByRole('button', { name: /Guardar la corrección de Julián/ }))
    expect(await screen.findByText('Escriba un correo válido')).toBeInTheDocument()
    await user.clear(campo)
    await user.type(campo, 'jm.pantoja@udea.edu.co')
    await user.click(screen.getByRole('button', { name: /Guardar la corrección de Julián/ }))
    expect(await screen.findByText(/Se corrigió correo del par de Julián/)).toBeInTheDocument()
  })

  it('the migrated article says so in its sheet; Inicio lists the pending corrections', async () => {
    const ficha = montarRuta('/reep/articulos/2024-018')
    expect(await screen.findByText('Migrado del Excel')).toBeInTheDocument()
    ficha.unmount()
    montarRuta('/inicio')
    expect((await screen.findAllByText('Registros migrados por corregir')).length).toBeGreaterThan(
      0,
    )
  })

  it('has no accessibility violations', async () => {
    const { container } = montarRuta('/reep/por-corregir')
    await screen.findByRole('table', { name: 'Registros migrados por corregir' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
