/*
 * Ajustes de noviembre: Inicio, informe de gestión como documento, respuesta del par en el correo,
 * firma de las plantillas de correo y alerta de la constancia sin imágenes.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { descargarArchivo } from '@/lib/descarga'
import { EncabezadoFicha } from '@/modules/articulos/components/EncabezadoFicha'
import { montarRuta } from '@/test/montarRuta'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ArticuloDetalle } from '@/types/articulo'
import type { EstadoAsignacion } from '@/types/par'

vi.mock('@/lib/descarga', async (original) => ({
  ...(await original<typeof import('@/lib/descarga')>()),
  descargarArchivo: vi.fn(),
}))

describe('Inicio', () => {
  it('has no summary line and opens each journal with «Abrir revista»', async () => {
    montarRuta('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument()
    expect(await screen.findAllByRole('link', { name: /Abrir revista/ })).toHaveLength(2)
    expect(screen.queryByText(/Resumen de ambas revistas/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Abrir el módulo/ })).toBeNull()
  })
})

describe('informe de gestión', () => {
  it('reads as a document: numbered sections, summary, charts, table and notes', async () => {
    montarRuta('/informes')
    expect(await screen.findByRole('heading', { level: 2, name: /Resumen ejecutivo/ })).toBeInTheDocument()
    for (const titulo of [
      /Indicadores principales/,
      /Actividad editorial y evaluación por pares/,
      /Comparativo por revista/,
      /Notas sobre los datos/,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: titulo })).toBeInTheDocument()
    }
    expect(screen.getByText(/Durante el .*, las dos revistas de la Universidad CESMAG/)).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(5)
  })

  it('saves as a PDF document built by the server, not a capture of the screen', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const { user } = montarRuta('/informes')
    await user.click(await screen.findByRole('button', { name: 'Guardar como PDF' }))
    await waitFor(() => expect(descargarArchivo).toHaveBeenCalledTimes(1))
    const [nombre, archivo] = vi.mocked(descargarArchivo).mock.calls[0] ?? []
    expect(nombre).toMatch(/^informe-de-gestion-\d{4}-[12]-ambas\.pdf$/)
    expect(archivo).toBeInstanceOf(Blob)
    expect(imprimir).not.toHaveBeenCalled()
    imprimir.mockRestore()
  })
})

describe('Correos enviados', () => {
  it('shows the answer of the peer in the detail of an invitation', async () => {
    const { user } = montarRuta('/reep/correos')
    const filas = await screen.findAllByRole('button', { name: /Ver el correo a/ })
    // the first invitation of the list: its detail says what the peer answered
    let encontrado = false
    for (const boton of filas) {
      await user.click(boton)
      const dialogo = await screen.findByRole('dialog', { name: 'Detalle del correo' })
      if (within(dialogo).queryByText('Respuesta del par')) {
        encontrado = true
        break
      }
      await user.keyboard('{Escape}')
    }
    expect(encontrado).toBe(true)
  })
})

describe('plantillas', () => {
  it('a mail template carries the signature image of the sender', async () => {
    montarRuta('/administracion/plantillas')
    expect(await screen.findByRole('heading', { level: 3, name: 'Firma del correo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Imagen de imagen de la firma')).toBeInTheDocument()
  })
})

describe('pares asignados en la ficha del artículo', () => {
  const articuloCon = (estados: EstadoAsignacion[]) =>
    ({
      numeroOjs: 'OJS-1',
      titulo: 'Un artículo',
      tipo: 'investigacion',
      estado: 'en-evaluacion',
      publicacion: null,
      coincidencias: null,
      migrado: false,
      asignaciones: estados.map((estado) => ({ estado })),
    }) as unknown as ArticuloDetalle

  it('counts only the peers who accepted, not the ones who declined the invitation', () => {
    render(
      <MemoryRouter>
        <EncabezadoFicha articulo={articuloCon(['acepto', 'no-acepto', 'no-acepto'])} />
      </MemoryRouter>,
    )
    expect(screen.getByText('1 par asignado')).toBeInTheDocument()
    expect(screen.queryByText(/3 pares/)).toBeNull()
  })

  it('tells how many invitations are still unanswered', () => {
    render(
      <MemoryRouter>
        <EncabezadoFicha articulo={articuloCon(['entrego', 'invitado'])} />
      </MemoryRouter>,
    )
    expect(screen.getByText('1 par asignado')).toBeInTheDocument()
    expect(screen.getByText('1 invitación sin responder')).toBeInTheDocument()
  })
})
