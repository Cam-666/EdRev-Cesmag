import { screen, waitFor, within } from '@testing-library/react'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { montarRuta } from '@/test/montarRuta'

describe('ajustes pedidos por la dependencia', () => {
  it('el buscador de autores se distingue de los datos: etiqueta «Buscar por ORCID o nombre»', async () => {
    montarRuta('/reep/articulos/nuevo')
    const buscador = await screen.findByLabelText('Buscar por ORCID o nombre')
    expect(buscador).toHaveAttribute('type', 'search')
    expect(buscador.className).toContain('bg-estado-info-fondo')
  })

  it('en una plantilla, los botones de datos escriben en el asunto cuando el cursor está en él', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(await screen.findByRole('button', { name: 'Editar Invitación a evaluar' }))
    const asunto = await screen.findByRole('textbox', { name: 'Asunto' })
    await user.clear(asunto)
    await user.type(asunto, 'Solicitud ')
    expect(screen.getByText('Insertar un dato en el asunto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Número de OJS' }))
    expect(asunto).toHaveValue('Solicitud [Número de OJS]')
    // los botones de respuesta solo van en el texto
    expect(screen.getByRole('button', { name: 'Botones de respuesta' })).toBeDisabled()
    await user.click(screen.getByRole('textbox', { name: 'Texto' }))
    expect(screen.getByText('Insertar un dato en el texto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Botones de respuesta' })).toBeEnabled()
  })

  it('la constancia ofrece el número de OJS', async () => {
    const { user } = montarRuta('/administracion/plantillas')
    await user.click(
      await screen.findByRole('button', { name: 'Editar Constancia de participación' }),
    )
    const grupo = await screen.findByRole('group', { name: 'Insertar un dato en el texto' })
    expect(within(grupo).getByRole('button', { name: 'Número de OJS' })).toBeInTheDocument()
  })

  it('el tablero muestra «Artículos sin pares» con enlace al listado filtrado', async () => {
    const { user } = montarRuta('/reep/tablero')
    const etiqueta = await screen.findByText('Artículos sin pares')
    const tarjeta = etiqueta.parentElement as HTMLElement
    const enlace = within(tarjeta).getByRole('link', { name: /Ver artículos/ })
    expect(enlace).toHaveAttribute('href', '/reep/articulos?sinPares=1')
    await user.click(enlace)
    expect(
      await screen.findByText(/aprobados por el comité que todavía no tienen pares/),
    ).toBeInTheDocument()
  })

  it('la Auxiliar entra a Administración por Plantillas y ve Auditoría y Configuración', async () => {
    const { user } = montarRuta('/administracion', AUXILIAR)
    expect(await screen.findByRole('tab', { name: 'Plantillas' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(screen.getByRole('tab', { name: 'Auditoría' }))
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Auditoría' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    )
    expect(screen.queryByRole('tab', { name: 'Usuarios' })).toBeNull()
  })
})
