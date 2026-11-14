import { screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { tokenInvitacion } from '@/mocks/handlers/invitaciones'
import { json, llamar } from '@/test/llamarApi'
import { montarRuta } from '@/test/montarRuta'
import type { ArticuloDetalle } from '@/types/articulo'
import type { ParDetalle } from '@/types/par'

/** A peer of 2026-012 whose invitation is still unanswered, and one that already accepted. */
async function asignaciones() {
  const art = await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-012'))
  const invitada = art.asignaciones.find((a) => a.estado === 'invitado' || a.estado === 'segundo-intento')
  const respondida = art.asignaciones.find((a) => a.estado === 'acepto' || a.estado === 'entrego')
  if (!invitada || !respondida) throw new Error('seed missing: 2026-012 needs an open and an answered invitation')
  return { invitada, respondida }
}

describe('answer from the invitation mail (/invitacion)', () => {
  it('«Acepto» asks to confirm, then registers the acceptance', async () => {
    const { invitada } = await asignaciones()
    const { user } = montarRuta(`/invitacion?token=${tokenInvitacion(invitada.id, 'acepto')}`)
    expect(await screen.findByRole('heading', { name: 'Aceptar la invitación' })).toBeInTheDocument()
    expect(screen.getAllByText(/Revista Electrónica en Educación y Pedagogía/).length).toBeGreaterThan(0)
    // Nothing is registered by only opening the link
    const antes = await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-012'))
    expect(antes.asignaciones.find((a) => a.id === invitada.id)?.estado).not.toBe('acepto')

    await user.click(screen.getByRole('button', { name: 'Sí, acepto evaluar este artículo' }))
    expect(await screen.findByText('Gracias, ya registramos su respuesta')).toBeInTheDocument()
    const despues = await json<ArticuloDetalle>(await llamar('/reep/articulos/2026-012'))
    expect(despues.asignaciones.find((a) => a.id === invitada.id)?.estado).toBe('acepto')
  })

  it('«No deseo participar más» blocks the peer; «No acepto esta invitación» does not', async () => {
    const { invitada } = await asignaciones()
    const { user } = montarRuta(`/invitacion?token=${tokenInvitacion(invitada.id, 'no-desea')}`)
    expect(await screen.findByText(/No recibirá nuevas invitaciones/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar: no deseo participar más' }))
    expect(await screen.findByText('Gracias, ya registramos su respuesta')).toBeInTheDocument()
    const par = await json<ParDetalle>(await llamar(`/reep/pares/${invitada.par.id}`))
    expect(par.bloqueo?.motivo).toBe('no-desea')
  })

  it('an answered invitation says so and offers no button', async () => {
    const { respondida } = await asignaciones()
    montarRuta(`/invitacion?token=${tokenInvitacion(respondida.id, 'acepto')}`)
    expect(await screen.findByText('Esta invitación ya fue respondida')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /acepto|no deseo/i })).toBeNull()
  })

  it('a wrong or missing link says it is not valid', async () => {
    montarRuta('/invitacion?token=basura')
    expect(await screen.findByText('El enlace no es válido')).toBeInTheDocument()
  })

  it('has no accessibility violations', async () => {
    const { invitada } = await asignaciones()
    const { container } = montarRuta(`/invitacion?token=${tokenInvitacion(invitada.id, 'no-acepto')}`)
    await screen.findByRole('button', { name: 'Confirmar: no acepto esta invitación' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
