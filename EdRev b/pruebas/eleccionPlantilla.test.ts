/*
 * Al asignar un par o emitir una constancia se elige la plantilla del correo (y se puede editar su texto solo para
 * ese envío). La elección se guarda con el correo y la usan el envío, el segundo intento y el reenvío.
 */
import { vi } from 'vitest'
import { describe, expect, it } from 'vitest'
import { pool } from '../src/db.js'
import { procesar } from '../src/servicios/envioCorreos.js'
import { articuloAprobado, candidato, como } from './api.js'

type Api = Awaited<ReturnType<typeof como>>

/** Crea una plantilla con texto y la devuelve (la predeterminada de su fin no cambia). */
async function plantilla(api: Api, revista: 'reep' | 'ire', fin: 'invitacion' | 'agradecimiento', asunto: string, cuerpo: string) {
  const r = await api.post('/plantillas', { revista, nombre: `${asunto} ${Date.now()}${Math.random()}`, fin })
  expect(r.status).toBe(201)
  expect((await api.put(`/plantillas/${r.body.id}`, { asunto, cuerpo })).status).toBe(200)
  return r.body as { id: string }
}

/** Envía lo que está en cola (modo simulado) y devuelve las líneas que quedaron en el registro. */
async function enviarCola(): Promise<string[]> {
  const antes = process.env.CORREO_MODO
  process.env.CORREO_MODO = 'simulado'
  const registro = vi.spyOn(console, 'log').mockImplementation(() => undefined)
  try {
    await procesar()
    return registro.mock.calls.map((c) => String(c[0]))
  } finally {
    registro.mockRestore()
    process.env.CORREO_MODO = antes
  }
}

describe('elegir la plantilla al enviar', () => {
  it('las plantillas que se ofrecen son las de la revista y el fin; la predeterminada sale primero', async () => {
    const api = await como()
    const extra = await plantilla(api, 'reep', 'invitacion', 'Alternativa', 'Hola {{par}}{{botones}}')
    const lista = (await api.get('/reep/correos/plantillas?fin=invitacion')).body as Array<{ id: string; predeterminada: boolean; cuerpo: string }>
    expect(lista[0]?.predeterminada).toBe(true)
    expect(lista.map((p) => p.id)).toContain(extra.id)
    // otra revista no ve la de esta
    const ire = (await api.get('/ire/correos/plantillas?fin=invitacion')).body as Array<{ id: string }>
    expect(ire.map((p) => p.id)).not.toContain(extra.id)
    expect((await api.get('/reep/correos/plantillas?fin=mensaje')).status).toBe(422)
    await api.delete(`/plantillas/${extra.id}`)
  })

  it('la vista previa muestra el correo con su marco y el texto que se escribe', async () => {
    const api = await como()
    const r = await api.post('/reep/correos/vista-previa', { fin: 'invitacion', cuerpo: 'Un texto nuevo para {{par}}{{botones}}' })
    expect(r.status).toBe(200)
    expect(r.body.html).toContain('Un texto nuevo para Luz Marina Burbano')
  })

  it('la invitación sale con la plantilla elegida y con el texto editado; el segundo intento conserva la elección', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const elegida = await plantilla(api, 'reep', 'invitacion', 'Asunto elegido {{revista}}', 'Cuerpo elegido {{par}}{{botones}}')
    const ajena = await plantilla(api, 'ire', 'invitacion', 'De otra revista', 'Hola {{par}}{{botones}}')
    const nuevo = (n: number) => ({
      nuevo: { nombre: `Eleccion ${art.id}-${n}`, profesion: 'Magíster', correo: `e${n}.${art.id}@udenar.edu.co`, universidad: 'Universidad Mariana', area: 'Educación' },
    })
    // una plantilla de otra revista, un texto con datos que no existen o una plantilla inexistente se rechazan
    expect((await api.post(`/reep/articulos/${art.id}/asignaciones`, { ...nuevo(1), plantillaId: ajena.id })).status).toBe(404)
    expect((await api.post(`/reep/articulos/${art.id}/asignaciones`, { ...nuevo(1), plantillaId: '999999' })).status).toBe(404)
    expect((await api.post(`/reep/articulos/${art.id}/asignaciones`, { ...nuevo(1), cuerpo: 'Hola {{inventado}}' })).status).toBe(422)

    const r = await api.post(`/reep/articulos/${art.id}/asignaciones`, { ...nuevo(1), plantillaId: elegida.id, asunto: 'Asunto editado', cuerpo: 'Texto editado para {{par}}{{botones}}' })
    expect(r.status).toBe(201)
    const id = Number(r.body.asignacion.id)
    const fila = (await pool.query('SELECT id_plantilla, asunto_propio, cuerpo_propio FROM correo WHERE id_evaluacion = $1', [id])).rows[0]
    expect(String(fila.id_plantilla)).toBe(elegida.id)
    expect(fila.asunto_propio).toBe('Asunto editado')

    const salida = await enviarCola()
    expect(salida.some((l) => l.includes('invitacion') && l.includes('Asunto editado'))).toBe(true)

    // sin editar el texto, sale con la plantilla elegida; y el segundo intento usa la misma
    const art2 = await articuloAprobado()
    const r2 = await api.post(`/reep/articulos/${art2.id}/asignaciones`, {
      nuevo: { nombre: `Eleccion ${art2.id}-2`, profesion: 'Magíster', correo: `e2.${art2.id}@udenar.edu.co`, universidad: 'Universidad Mariana', area: 'Educación' },
      plantillaId: elegida.id,
    })
    const id2 = Number(r2.body.asignacion.id)
    expect((await enviarCola()).some((l) => l.includes('invitacion') && l.includes('Asunto elegido'))).toBe(true)
    await pool.query("UPDATE correo SET fecha_envio = now() - interval '30 days' WHERE id_evaluacion = $1", [id2])
    const { revisar } = await import('../src/servicios/segundoIntento.js')
    await revisar()
    const intentos = (await pool.query('SELECT id_plantilla FROM correo WHERE id_evaluacion = $1 ORDER BY id_correo', [id2])).rows
    expect(intentos).toHaveLength(2)
    expect(String(intentos[1].id_plantilla)).toBe(elegida.id)

    // al eliminar la plantilla elegida, los correos que la usaban vuelven a la predeterminada
    expect((await api.delete(`/plantillas/${elegida.id}`)).status).toBe(204)
    expect((await pool.query('SELECT id_plantilla FROM correo WHERE id_evaluacion = $1', [id2])).rows.every((x) => x.id_plantilla === null)).toBe(true)
    await api.delete(`/plantillas/${ajena.id}`)
  })

  it('la constancia sale con el agradecimiento elegido', async () => {
    const api = await como()
    const gracias = await plantilla(api, 'reep', 'agradecimiento', 'Gracias especiales {{revista}}', 'Gracias {{par}} por «{{articulo}}»')
    const malo = await api.post('/reep/constancias/emitir-pendientes', { conAgradecimiento: true, plantillaId: '999999' })
    expect(malo.status).toBe(404)
    const sinAgradecimiento = await api.post('/reep/constancias/emitir-pendientes', { conAgradecimiento: false, plantillaId: '999999' })
    expect(sinAgradecimiento.status).toBe(200) // sin agradecimiento no hay plantilla que validar
    await api.delete(`/plantillas/${gracias.id}`)
  })
})
