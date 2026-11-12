// @vitest-environment node
/*
 * Upload of the constancia's PDF background (RF-45). It runs in Node because the browser
 * simulator used by the other tests cannot parse multipart bodies.
 */
import { json, llamar, multipart } from '@/test/llamarApi'
import type { Plantilla } from '@/types/plantilla'

describe('PDF background of the constancia (mock, RF-45)', () => {
  it('uploads the PDF background of a constancia; only PDF, only for the constancia', async () => {
    const subir = (id: string, nombre: string, tipo: string) =>
      llamar(`/plantillas/${id}/fondo`, {
        metodo: 'POST',
        cuerpoCrudo: multipart('archivo', nombre, tipo, '%PDF-1.7'),
      })
    const ok = await subir('ire-constancia', 'fondo-2027.pdf', 'application/pdf')
    expect(ok.status).toBe(200)
    expect((await json<Plantilla>(ok)).fondoPdf).toMatchObject({ nombre: 'fondo-2027.pdf' })
    expect((await subir('ire-constancia', 'fondo.png', 'image/png')).status).toBe(422)
    expect((await subir('ire-invitacion', 'fondo-2027.pdf', 'application/pdf')).status).toBe(409)
  })
})
