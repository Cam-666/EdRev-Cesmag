import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Paginacion, paginasVisibles } from './Paginacion'

describe('Paginacion', () => {
  it('summarizes the range and navigates', async () => {
    const onCambiar = vi.fn()
    render(<Paginacion pagina={1} porPagina={6} total={142} onCambiar={onCambiar} />)
    expect(screen.getByText('1–6 de 142')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onCambiar).toHaveBeenCalledWith(2)
  })

  it('collapses distant pages with ellipsis', () => {
    expect(paginasVisibles(1, 24)).toEqual([1, 2, null, 24])
    expect(paginasVisibles(12, 24)).toEqual([1, null, 11, 12, 13, null, 24])
  })
})
