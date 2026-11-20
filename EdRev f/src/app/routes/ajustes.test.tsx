/*
 * Ajustes de noviembre: Inicio, informe de gestión como documento, respuesta del par en el correo,
 * la plantilla de correo sin firma y alerta de la constancia sin imágenes.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'
import { descargarArchivo } from '@/lib/descarga'
import { EncabezadoFicha } from '@/modules/articulos/components/EncabezadoFicha'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'
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
    // la primera invitación del listado: su detalle dice qué respondió el par
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

describe('plantillas: cada una conserva el fin para el que se creó', () => {
  it('la vista previa de una plantilla de agradecimiento nueva es la de agradecimiento, no la de invitación', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva plantilla' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Gracias de fin de año')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await elegirOpcion(user, 'Uso de la plantilla', 'Correo de agradecimiento')
    const marco = await screen.findByTitle('Vista previa del correo')
    await waitFor(() => expect(marco).toHaveAttribute('srcdoc', expect.stringContaining('Gracias por su evaluación')))
    expect(marco.getAttribute('srcdoc')).not.toContain('Invitación a evaluar un artículo')
    // la lista dice para qué sirve cada una
    expect(screen.getByRole('combobox', { name: 'Plantilla' })).toHaveTextContent('Gracias de fin de año · Correo libre')
  })

  it('una plantilla de agradecimiento se marca «en uso» desde ella misma, sin pasar por Configuración', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva plantilla' })
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Solo para agradecer')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await screen.findByTitle('Vista previa del correo')
    // cada uso se explica con una frase sencilla
    await elegirOpcion(user, 'Uso de la plantilla', 'Correo de agradecimiento')
    expect(screen.getByText(/Se envía sola, junto con la constancia/)).toBeInTheDocument()
    // la plantilla trae su propio botón; ya no hay que ir a Configuración
    expect(screen.getByRole('button', { name: 'Usar esta plantilla' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Plantilla' })).toHaveTextContent('Solo para agradecer')
  })
})

describe('firma de los correos', () => {
  it('ya no se escribe en Configuración: la firma es la imagen de cada plantilla', async () => {
    montarRuta('/administracion/configuracion')
    // Configuración ya no elige plantillas: solo los días de espera y los datos de la constancia
    expect(await screen.findByRole('heading', { level: 3, name: 'Respuesta de los pares' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Plantillas de los correos' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Firma de los correos' })).toBeNull()
    expect(screen.queryByLabelText('Nombre de quien firma')).toBeNull()
  })

  it('la vista previa del correo y las plantillas de correo no tienen firma', async () => {
    montarRuta('/administracion/plantillas')
    const marco = await screen.findByTitle('Vista previa del correo')
    await waitFor(() => expect(marco.getAttribute('srcdoc')).toContain('Aviso de datos personales'))
    expect(marco.getAttribute('srcdoc')).not.toContain('alt="Firma"')
    expect(screen.queryByRole('heading', { name: 'Firma del correo' })).toBeNull()
    expect(screen.queryByLabelText('Imagen de imagen de la firma')).toBeNull()
  })
})

describe('plantillas: la constancia es permanente y el aviso de guardado está debajo de los botones', () => {
  it('la constancia no tiene menú de uso, ni «Usar esta plantilla», ni se puede eliminar', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await screen.findByRole('combobox', { name: 'Plantilla' })
    await elegirOpcion(user, 'Plantilla', 'Constancia de participación · EN USO')
    expect(await screen.findByText(/Siempre está en uso: solo se edita/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Uso de la plantilla' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Usar esta plantilla' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar plantilla' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar plantilla' })).toBeInTheDocument()
  })

  it('al guardar, el aviso verde sale debajo del botón Guardar, donde se ve', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    const guardar = await screen.findByRole('button', { name: 'Guardar plantilla' })
    expect(screen.queryByText(/Plantilla guardada/)).toBeNull()
    await user.click(guardar)
    const aviso = await screen.findByText(/Plantilla guardada\. Los próximos envíos usarán el texto nuevo/)
    // el aviso está después del botón en la página (abajo del todo), no arriba del formulario
    expect(guardar.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('una plantilla en uso no cambia de uso: el menú está bloqueado y lo explica', async () => {
    montarRuta('/administracion/plantillas')
    const menu = await screen.findByRole('combobox', { name: 'Uso de la plantilla' })
    expect(menu).toBeDisabled()
    expect(screen.getAllByText(/primero use otra plantilla/).length).toBeGreaterThan(0)
  })
})
