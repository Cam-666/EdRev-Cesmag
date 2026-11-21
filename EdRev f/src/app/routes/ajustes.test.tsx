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

describe('plantillas: sin conceptos técnicos', () => {
  it('la vista previa de cada texto automático es la suya: el agradecimiento no muestra la invitación', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Editar Agradecimiento' }))
    const marco = await screen.findByTitle('Vista previa del correo')
    await waitFor(() => expect(marco).toHaveAttribute('srcdoc', expect.stringContaining('Gracias por su evaluación')))
    expect(marco.getAttribute('srcdoc')).not.toContain('Invitación a evaluar un artículo')
  })

  it('al crear una plantilla se pide la revista, el nombre y para qué es; un mensaje libre se explica con una frase sencilla', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Nueva plantilla' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva plantilla' })
    expect(within(dialogo).getByRole('combobox', { name: 'Revista' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('combobox', { name: '¿Para qué es?' })).toHaveTextContent('Invitar a un par evaluador')
    await user.type(within(dialogo).getByLabelText('Nombre'), 'Solo para agradecer')
    await elegirOpcion(user, '¿Para qué es?', 'Mensaje libre para un par o un autor')
    await user.click(within(dialogo).getByRole('button', { name: 'Crear plantilla' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await screen.findByTitle('Vista previa del correo')
    expect(screen.getByText(/Sirve para escribirle a un par o a un autor/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar esta plantilla' })).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: /Solo para agradecer/ })).toBeInTheDocument()
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
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Editar Invitación a evaluar' }))
    const marco = await screen.findByTitle('Vista previa del correo')
    await waitFor(() => expect(marco.getAttribute('srcdoc')).toContain('Aviso de datos personales'))
    expect(marco.getAttribute('srcdoc')).not.toContain('alt="Firma"')
    expect(screen.queryByRole('heading', { name: 'Firma del correo' })).toBeNull()
    expect(screen.queryByLabelText('Imagen de imagen de la firma')).toBeNull()
  })
})

describe('plantillas: lo automático es permanente y el aviso de guardado está debajo del botón', () => {
  it('la constancia solo se edita; la plantilla habitual no se elimina y las demás sí', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    const grupo = async (nombre: string) =>
      (await screen.findByRole('heading', { level: 3, name: nombre })).closest('section') as HTMLElement
    const constancia = await grupo('Constancia de participación')
    expect(within(constancia).getAllByRole('button', { name: /Editar/ })).toHaveLength(1)
    expect(within(constancia).queryByRole('button', { name: /Eliminar/ })).toBeNull()
    // invitaciones: la habitual se señala y no se elimina; la otra se puede dejar como habitual o eliminar
    const invitaciones = await grupo('Invitación al par evaluador')
    expect(within(invitaciones).getByText('Invitación a evaluar · La habitual')).toBeInTheDocument()
    expect(within(invitaciones).queryByRole('button', { name: 'Eliminar Invitación a evaluar' })).toBeNull()
    expect(within(invitaciones).getByRole('button', { name: 'Eliminar Invitación breve' })).toBeInTheDocument()
    await user.click(within(invitaciones).getByRole('button', { name: 'Usar como la habitual Invitación breve' }))
    expect(await within(invitaciones).findByText('Invitación breve · La habitual')).toBeInTheDocument()
    expect(within(invitaciones).getByRole('button', { name: 'Eliminar Invitación a evaluar' })).toBeInTheDocument()
    await user.click(within(constancia).getByRole('button', { name: /Editar/ }))
    expect(await screen.findByText(/documento PDF de la constancia/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar plantilla' })).toBeInTheDocument()
  }, 40_000)

  it('al guardar, el aviso verde sale debajo del botón Guardar, donde se ve', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Editar Invitación a evaluar' }))
    const guardar = await screen.findByRole('button', { name: 'Guardar plantilla' })
    expect(screen.queryByText(/Plantilla guardada/)).toBeNull()
    await user.click(guardar)
    const aviso = await screen.findByText(/Plantilla guardada\. Los próximos envíos usarán el texto nuevo/)
    expect(guardar.compareDocumentPosition(aviso) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('elegir la plantilla al enviar', () => {
  it('al asignar un par se abre la invitación: sale la habitual, se puede escoger otra o cambiar su texto solo para este envío', async () => {
    const { user } = montarRuta('/reep/articulos/2026-033/pares')
    await user.click(await screen.findByRole('button', { name: 'Asignar par' }))
    const panel = await screen.findByRole('region', { name: 'Asignar par evaluador' })
    const tabla = await within(panel).findByRole('table', { name: 'Pares disponibles' })
    const boton = (await within(tabla).findAllByRole('button', { name: /^Asignar a / }))[0] as HTMLElement
    await user.click(boton)

    const ventana = await screen.findByRole('dialog', { name: /^Invitar a / })
    // todavía no se asignó nada: primero se revisa el correo
    expect(await within(ventana).findByTitle('Vista previa del correo')).toBeInTheDocument()
    const menu = within(ventana).getByRole('combobox', { name: 'Plantilla de la invitación' })
    expect(menu).toHaveTextContent('Invitación a evaluar (la habitual)')
    await elegirOpcion(user, 'Plantilla de la invitación', 'Invitación breve')
    expect(menu).toHaveTextContent('Invitación breve')

    // cambiar el texto es solo para este correo
    await user.click(within(ventana).getByRole('button', { name: 'Cambiar el texto de este correo' }))
    expect(within(ventana).getByText(/solo para este correo: la plantilla no se modifica/)).toBeInTheDocument()
    expect(within(ventana).getByLabelText('Asunto')).toBeInTheDocument()
    await user.click(within(ventana).getByRole('button', { name: 'Volver al texto de la plantilla' }))
    expect(within(ventana).queryByLabelText('Asunto')).toBeNull()

    // cancelar no asigna a nadie
    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Par asignado e invitación enviada')).toBeNull()
  })

  it('al emitir una constancia con agradecimiento se escoge su plantilla; sin agradecimiento no hay nada que escoger', async () => {
    const { user } = montarRuta('/reep/constancias')
    const tabla = await screen.findByRole('table', { name: 'Constancias pendientes de emisión' })
    await user.click((await within(tabla).findAllByRole('button', { name: /^Emitir la constancia de/ }))[0] as HTMLElement)
    expect(await screen.findByText(/CERTIFICA QUE/)).toBeInTheDocument()
    const menu = await screen.findByRole('combobox', { name: 'Plantilla de el agradecimiento' })
    expect(menu).toHaveTextContent('Agradecimiento (la habitual)')
    await elegirOpcion(user, 'Plantilla de el agradecimiento', 'Agradecimiento breve')
    await user.click(screen.getByRole('checkbox', { name: 'Emitir con correo de agradecimiento' }))
    expect(screen.queryByRole('combobox', { name: 'Plantilla de el agradecimiento' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Emitir y enviar' }))
    expect(await screen.findByText(/Quedó registrada en Correos enviados/)).toBeInTheDocument()
  })
})
