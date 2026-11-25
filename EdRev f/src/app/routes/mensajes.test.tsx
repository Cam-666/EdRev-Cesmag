import { screen, waitFor, within } from '@testing-library/react'
import { AUXILIAR } from '@/mocks/seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import { elegirOpcion, montarRuta } from '@/test/montarRuta'
import type { CorreoEnviado } from '@/types/historial'

interface RespuestaPares {
  items: Array<{ id: string; nombre: string; correo: string }>
}

async function par(nombre: string) {
  const lista = await json<RespuestaPares>(await llamar('/reep/pares?estado=todos&porPagina=100'))
  const p = lista.items.find((x) => x.nombre === nombre)
  if (!p) throw new Error(`No está el par ${nombre}`)
  return p
}

describe('enviar un correo a mano (Enviar correo)', () => {
  it('desde la ficha de un par: se elige la plantilla, se ve el correo y queda en «Correos enviados»', async () => {
    const luz = await par('Luz Marina Burbano')
    const { user } = montarRuta(`/pares/${luz.id}`)
    await user.click(await screen.findByRole('button', { name: 'Enviar correo' }))
    const dialogo = await screen.findByRole('dialog', {
      name: 'Enviar correo a Luz Marina Burbano',
    })
    // los tres pasos están a la vista, con la primera plantilla ya propuesta
    expect(
      within(dialogo).getByRole('combobox', { name: '1. ¿Desde qué revista se envía?' }),
    ).toBeInTheDocument()
    expect(await within(dialogo).findByRole('combobox', { name: 'Plantilla' })).toHaveTextContent(
      'Mensaje general',
    )
    const marco = await within(dialogo).findByTitle('Vista previa del correo')
    await waitFor(() =>
      expect(marco).toHaveAttribute('srcdoc', expect.stringContaining('Luz Marina Burbano')),
    )
    expect(within(dialogo).getByText(/lm\.burbano@udenar\.edu\.co/)).toBeInTheDocument()

    await user.click(within(dialogo).getByRole('button', { name: 'Enviar correo' }))
    const listo = await screen.findByRole('dialog', { name: 'Correo enviado' })
    expect(
      within(listo).getByText(/Puede ver este mensaje en «Correos enviados» de/),
    ).toBeInTheDocument()
    await user.click(within(listo).getByRole('button', { name: 'Listo' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    // el mensaje queda en el registro de la revista desde la que salió, con el tipo «Mensaje» y sin artículo
    const registro = await json<{ items: CorreoEnviado[] }>(
      await llamar('/reep/correos?tipo=mensaje'),
    )
    expect(registro.items[0]).toMatchObject({
      tipo: 'mensaje',
      destinatario: 'lm.burbano@udenar.edu.co',
      articuloId: '',
    })
    expect(
      (await json<{ items: CorreoEnviado[] }>(await llamar('/ire/correos?tipo=mensaje'))).items,
    ).toHaveLength(0)
  })

  it('se puede escribir el mensaje ahí mismo, a partir de la plantilla, sin guardarlo como plantilla', async () => {
    const luz = await par('Luz Marina Burbano')
    const antes = await json<{ plantillas: unknown[] }>(await llamar('/plantillas'))
    const { user } = montarRuta(`/pares/${luz.id}`)
    await user.click(await screen.findByRole('button', { name: 'Enviar correo' }))
    const dialogo = await screen.findByRole('dialog', {
      name: 'Enviar correo a Luz Marina Burbano',
    })
    await within(dialogo).findByRole('combobox', { name: 'Plantilla' })
    await user.click(within(dialogo).getByRole('button', { name: 'Escribir el mensaje' }))
    expect(within(dialogo).getByText(/no se guarda como plantilla/)).toBeInTheDocument()
    // parte del texto de la plantilla elegida, y se puede cambiar el asunto con un dato de la persona
    const texto = within(dialogo).getByRole('textbox', { name: 'Texto' })
    expect(texto.textContent).not.toBe('')
    const asunto = within(dialogo).getByRole('textbox', { name: 'Asunto' })
    await user.clear(asunto)
    await user.type(asunto, 'Recordatorio para ')
    await user.click(within(dialogo).getByRole('button', { name: 'Nombre del destinatario' }))
    expect(asunto).toHaveValue('Recordatorio para [Nombre del destinatario]')
    await waitFor(() =>
      expect(within(dialogo).getByText(/Recordatorio para Luz Marina Burbano/)).toBeInTheDocument(),
    )
    await user.click(within(dialogo).getByRole('button', { name: 'Enviar correo' }))
    await screen.findByRole('dialog', { name: 'Correo enviado' })
    const registro = await json<{ items: CorreoEnviado[] }>(
      await llamar('/reep/correos?tipo=mensaje'),
    )
    expect(registro.items[0]).toMatchObject({ asunto: 'Recordatorio para Luz Marina Burbano' })
    const despues = await json<{ plantillas: unknown[] }>(await llamar('/plantillas'))
    expect(despues.plantillas).toHaveLength(antes.plantillas.length)
  })

  it('el mensaje aparece en «Correos enviados» como «Mensaje», sin artículo y sin «Corregir»', async () => {
    const luz = await par('Luz Marina Burbano')
    await llamar('/ire/mensajes', {
      metodo: 'POST',
      cuerpo: { destino: { tipo: 'par', id: luz.id }, plantillaId: 'ire-mensaje' },
    })
    montarRuta('/ire/correos')
    const tabla = await screen.findByRole('table', { name: 'Registro de envíos de la revista' })
    const fila = (await within(tabla).findByText('lm.burbano@udenar.edu.co')).closest('tr')
    expect(fila).not.toBeNull()
    expect(within(fila as HTMLElement).getByText('Mensaje')).toBeInTheDocument()
    expect(within(fila as HTMLElement).queryByRole('button', { name: /Corregir/ })).toBeNull()
  })

  it('desde la ficha de un autor: la Auxiliar también puede escribirle y cambiar de revista cambia las plantillas', async () => {
    const { user } = montarRuta('/autores/ire-au-1', AUXILIAR)
    await user.click(await screen.findByRole('button', { name: 'Enviar correo' }))
    const dialogo = await screen.findByRole('dialog', { name: /^Enviar correo a / })
    await within(dialogo).findByRole('combobox', { name: 'Plantilla' })
    await elegirOpcion(
      user,
      '1. ¿Desde qué revista se envía?',
      'Revista Investigium IRE: Ciencias Sociales y Humanas',
    )
    await waitFor(() =>
      expect(within(dialogo).getByRole('combobox', { name: 'Plantilla' })).toHaveTextContent(
        'Mensaje general',
      ),
    )
    expect(within(dialogo).getByRole('button', { name: 'Enviar correo' })).toBeInTheDocument()
  })

  it('una plantilla de mensaje solo sirve en su revista y a quien no tiene correo no se le puede escribir', async () => {
    const luz = await par('Luz Marina Burbano')
    // la plantilla de la otra revista se rechaza
    const otra = await llamar('/reep/mensajes', {
      metodo: 'POST',
      cuerpo: { destino: { tipo: 'par', id: luz.id }, plantillaId: 'ire-mensaje' },
    })
    expect(otra.status).toBe(404)
    // una plantilla de invitación no es de mensaje
    const invitacion = await llamar('/reep/mensajes', {
      metodo: 'POST',
      cuerpo: { destino: { tipo: 'par', id: luz.id }, plantillaId: 'reep-invitacion' },
    })
    expect(invitacion.status).toBe(404)
    // un autor sin correo
    const nuevo = await llamar('/reep/autores', {
      metodo: 'POST',
      cuerpo: {
        nombre: 'Autora Sin Correo',
        correo: '',
        orcid: '',
        filiacion: 'Universidad de Nariño',
        pais: 'Colombia',
      },
    })
    const autor = await json<{ id: string }>(nuevo)
    const sinCorreo = await llamar('/reep/mensajes', {
      metodo: 'POST',
      cuerpo: { destino: { tipo: 'autor', id: autor.id }, plantillaId: 'reep-mensaje' },
    })
    expect(sinCorreo.status).toBe(409)
  })

  it('una plantilla de mensaje no tiene «en uso» y sus datos son los de la persona', async () => {
    const lista = await json<{
      plantillas: Array<{ id: string; variables: string[]; enUso: boolean }>
    }>(await llamar('/plantillas'))
    const mensaje = lista.plantillas.find((p) => p.id === 'reep-mensaje')
    expect(mensaje?.enUso).toBe(false)
    expect(mensaje?.variables).toEqual(expect.arrayContaining(['nombre', 'revista', 'universidad']))
  })
})
