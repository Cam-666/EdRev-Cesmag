// @vitest-environment node
/*
 * Upload of the header, footer and signature images of a file template (RF-45), and the ISSN and
 * indexations of each journal. It runs in Node because the browser simulator used by the other
 * tests cannot parse multipart bodies.
 */
import { json, llamar, multipart } from '@/test/llamarApi'
import type { Configuracion } from '@/types/configuracion'
import type { Plantilla } from '@/types/plantilla'

describe('images of the file template (mock, RF-45)', () => {
  const subir = (id: string, parte: string, nombre: string, tipo: string) =>
    llamar(`/plantillas/${id}/imagen/${parte}`, {
      metodo: 'POST',
      cuerpoCrudo: multipart('archivo', nombre, tipo, 'contenido'),
    })

  it('uploads and removes an image; only PNG or JPG, only for the file template', async () => {
    const ok = await subir('ire-constancia', 'pie', 'pie-2027.png', 'image/png')
    expect(ok.status).toBe(200)
    expect((await json<Plantilla>(ok)).imagenes?.pie).toMatchObject({ nombre: 'pie-2027.png' })
    expect((await subir('ire-constancia', 'pie', 'pie.pdf', 'application/pdf')).status).toBe(422)
    expect((await subir('ire-constancia', 'lateral', 'a.png', 'image/png')).status).toBe(404)
    // A mail template carries no images at all
    for (const parte of ['encabezado', 'pie', 'firma']) {
      expect((await subir('ire-invitacion', parte, 'a.png', 'image/png')).status).toBe(409)
    }

    const quitada = await llamar('/plantillas/ire-constancia/imagen/firma', { metodo: 'DELETE' })
    expect((await json<Plantilla>(quitada)).imagenes?.firma).toBeNull()
  })

  it('the preview of a file template is a PDF; a mail template has none', async () => {
    const pdf = await llamar('/plantillas/reep-constancia/vista-previa')
    expect(pdf.headers.get('Content-Type')).toBe('application/pdf')
    expect((await llamar('/plantillas/reep-invitacion/vista-previa')).status).toBe(409)
  })
})

describe('ISSN and indexations of each journal (mock)', () => {
  it('shows them in the configuration and saves a change per journal', async () => {
    const antes = await json<Configuracion>(await llamar('/configuracion'))
    expect(antes.revistas.reep.issn).toBe('2590-7476')
    const cambio = { issn: '2590-7476', indexaciones: 'Publindex (categoría B) y Scopus' }
    const r = await llamar('/configuracion/revistas/reep', { metodo: 'PUT', cuerpo: cambio })
    expect(r.status).toBe(200)
    const despues = await json<Configuracion>(await llamar('/configuracion'))
    expect(despues.revistas.reep.indexaciones).toBe('Publindex (categoría B) y Scopus')
    expect(despues.revistas.ire.indexaciones).toBe(antes.revistas.ire.indexaciones)
    const mala = await llamar('/configuracion/revistas/ire', {
      metodo: 'PUT',
      cuerpo: { issn: '12', indexaciones: '' },
    })
    expect(mala.status).toBe(422)
  })
})
