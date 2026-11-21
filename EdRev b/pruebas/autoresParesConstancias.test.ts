/*
 * Pruebas de varios ajustes del proceso: agregar autores a un artículo, pares que ya están en el sistema,
 * el concepto antes de la constancia, universidades sin duplicados por mayúsculas, la respuesta del par
 * desde el correo, las imágenes de las plantillas, los pares asignados que de verdad aceptaron y el
 * resultado del artículo según los conceptos de los pares.
 */
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app, articuloAprobado, candidato, como } from './api.js'
import { fechaLocal } from '../src/lib/fechas.js'

const hoy = () => fechaLocal()
const unico = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function articulo() {
  const api = await como()
  const r = await api.post('/reep/articulos', {
    numeroOjs: `A-${unico()}`,
    titulo: 'Artículo con autores',
    tipo: 'reflexion',
    fechaPostulacion: '2026-10-01',
    autores: [{ nuevo: { nombre: `Autor ${unico()}`, correo: '', orcid: '', filiacion: 'U', pais: 'Colombia' } }],
  })
  return r.body as { id: string }
}

describe('agregar autores a un artículo', () => {
  it('agrega un autor nuevo, lo reutiliza por su ORCID y no repite ni pasa de siete', async () => {
    const api = await como()
    const art = await articulo()
    const orcid = '0000-0002-1825-0097'
    const nuevo = { nombre: 'Josiah Carberry', correo: '', orcid, filiacion: 'Brown', pais: 'Estados Unidos' }
    const primero = await api.post(`/reep/articulos/${art.id}/autores`, { nuevo })
    expect(primero.status).toBe(201)
    expect(primero.body.autores).toHaveLength(2)

    // el mismo ORCID en otro artículo no crea un segundo autor: es la misma persona
    const otro = await articulo()
    const reutilizado = await api.post(`/reep/articulos/${otro.id}/autores`, { nuevo })
    expect(reutilizado.status).toBe(201)
    const encontrados = (await api.get(`/reep/autores?q=${orcid}&porPagina=50`)).body
    expect(encontrados.total).toBe(1)

    // el mismo autor dos veces en un artículo
    expect((await api.post(`/reep/articulos/${art.id}/autores`, { nuevo })).status).toBe(409)

    // al registrar un artículo con un ORCID del directorio tampoco falla
    const conOrcid = await api.post('/reep/articulos', {
      numeroOjs: `A-${unico()}`,
      titulo: 'Con ORCID repetido',
      tipo: 'revision',
      fechaPostulacion: '2026-10-02',
      autores: [{ nuevo }],
    })
    expect(conOrcid.status).toBe(201)

    // hasta siete autores
    for (let i = 0; i < 5; i += 1) {
      const r = await api.post(`/reep/articulos/${art.id}/autores`, {
        nuevo: { nombre: `Coautor ${i} ${unico()}`, correo: '', orcid: '', filiacion: '', pais: '' },
      })
      expect(r.status).toBe(201)
    }
    const octavo = await api.post(`/reep/articulos/${art.id}/autores`, {
      nuevo: { nombre: 'Octavo', correo: '', orcid: '', filiacion: '', pais: '' },
    })
    expect(octavo.status).toBe(409)
  })
})

describe('un par que ya está en el sistema', () => {
  it('avisa por el nombre aunque cambien el correo, las tildes o las mayúsculas, y dice si está bloqueado', async () => {
    const api = await como()
    const marca = unico()
    const creado = await api.post('/reep/pares', {
      nombre: `María Camila Pérez ${marca}`,
      profesion: '',
      correo: `maria.${marca}@x.co`,
      universidad: 'U',
      area: 'A',
    })
    expect(creado.status).toBe(201)

    const repetido = await api.post('/ire/pares', {
      nombre: `maria  camila perez ${marca}`,
      correo: `otro.${marca}@x.co`,
      universidad: 'Otra',
      area: 'B',
    })
    expect(repetido.status).toBe(409)
    expect(repetido.body.mensaje).toContain('ya se encuentra registrado en el sistema')
    expect(repetido.body).toMatchObject({ parId: creado.body.id, bloqueado: false })

    await api.post(`/reep/pares/${creado.body.id}/bloquear`, { motivo: 'no-desea' })
    const bloqueado = await api.post('/reep/pares', {
      nombre: `MARÍA CAMILA PÉREZ ${marca}`,
      correo: `tercero.${marca}@x.co`,
      universidad: 'U',
      area: 'A',
    })
    expect(bloqueado.status).toBe(409)
    expect(bloqueado.body.mensaje).toContain('está bloqueado')
    expect(bloqueado.body.bloqueado).toBe(true)
  })

  it('al asignar un candidato nuevo con el nombre de un par registrado, avisa y no lo repite', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const primero = await candidato(art.id, 7)
    const nombre = (await api.get(`/reep/pares/${primero.par.id}`)).body.nombre as string
    const r = await api.post(`/reep/articulos/${art.id}/asignaciones`, {
      nuevo: { nombre: nombre.toUpperCase(), profesion: '', correo: `distinto${unico()}@x.co`, universidad: 'U', area: 'A' },
    })
    expect(r.status).toBe(409)
    expect(r.body.mensaje).toContain('ya se encuentra registrado')
  })
})

describe('un par de la misma institución de los autores', () => {
  it('«Cesmag» es la misma institución que «Universidad Cesmag»: no se asigna', async () => {
    const api = await como()
    const art = await api.post('/reep/articulos', {
      numeroOjs: `A-${unico()}`,
      titulo: 'Autores de la Universidad Cesmag',
      tipo: 'reflexion',
      fechaPostulacion: '2026-10-01',
      autores: [{ nuevo: { nombre: `Autor ${unico()}`, correo: '', orcid: '', filiacion: 'Universidad Cesmag', pais: 'Colombia' } }],
    })
    await api.post(`/reep/articulos/${art.body.id}/rondas`, { coincidencias: 5, atribuidoIa: 1, resultado: 'aprobado', observacion: '' })
    const r = await api.post(`/reep/articulos/${art.body.id}/asignaciones`, {
      nuevo: { nombre: `Par ${unico()}`, correo: `p${unico()}@x.co`, universidad: 'Cesmag', area: 'A' },
    })
    expect(r.status).toBe(409)
    expect(r.body.mensaje).toContain('la misma institución')
  })
})

describe('la universidad no se duplica por mayúsculas', () => {
  it('«cesmag» se guarda como el «Cesmag» que ya existe y el filtro lo trata como uno solo', async () => {
    const api = await como()
    const marca = unico()
    const base = `Universidad Prueba${marca}`
    await api.post('/reep/pares', { nombre: `Uno ${marca}`, correo: `u1.${marca}@x.co`, universidad: base, area: 'Área X' })
    const segundo = await api.post('/reep/pares', {
      nombre: `Dos ${marca}`,
      correo: `u2.${marca}@x.co`,
      universidad: base.toUpperCase(),
      area: 'ÁREA x',
    })
    expect(segundo.body.universidad).toBe(base)
    const lista = (await api.get('/reep/pares/universidades')).body as string[]
    expect(lista.filter((u) => u.toLowerCase() === base.toLowerCase())).toEqual([base])
    const filtrados = (await api.get(`/reep/pares?universidad=${encodeURIComponent(base.toLowerCase())}&estado=todos&porPagina=50`)).body
    expect(filtrados.total).toBe(2)
  })
})

describe('el concepto va antes de la constancia', () => {
  it('la entrega registra concepto y fecha; sin concepto no se emite la constancia', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const p = await candidato(art.id, 8)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    // una entrega sin concepto queda como estaba (migraciones): la constancia espera el concepto
    await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy() })
    const sin = await api.post(`/reep/constancias/${p.asignacion.id}/emitir`, {})
    expect(sin.status).toBe(409)
    expect(sin.body.mensaje).toContain('Registre primero el concepto')
    await api.post(`/reep/asignaciones/${p.asignacion.id}/concepto`, { concepto: 'publicable' })
    expect((await api.post(`/reep/constancias/${p.asignacion.id}/emitir`, {})).status).toBe(200)
  })

  it('al marcar la entrega con el concepto, la constancia se puede emitir enseguida', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const p = await candidato(art.id, 9)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    const entrega = await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy(), concepto: 'no-publicable' })
    expect(entrega.status).toBe(200)
    expect(entrega.body.concepto).toBe('no-publicable')
    expect((await api.post(`/reep/constancias/${p.asignacion.id}/emitir`, {})).status).toBe(200)
  })
})

describe('el correo de invitación muestra la respuesta del par', () => {
  it('sin respuesta aún, después de aceptar y cuando no desea participar más', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const a = await candidato(art.id, 10)
    const b = await candidato(art.id, 11)
    const respuestas = async (idAsignacion: string) => {
      const items = (await api.get('/reep/correos?porPagina=200')).body.items as Array<{
        asignacionId: string
        tipo: string
        respuestaPar: { respuesta: string; medio: string | null } | null
      }>
      return items.find((c) => c.asignacionId === idAsignacion && c.tipo === 'invitacion')?.respuestaPar
    }
    expect((await respuestas(a.asignacion.id))?.respuesta).toBe('sin-respuesta-aun')
    await api.post(`/reep/asignaciones/${a.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    expect(await respuestas(a.asignacion.id)).toMatchObject({ respuesta: 'acepto', medio: 'manual' })
    await api.post(`/reep/asignaciones/${b.asignacion.id}/respuesta`, { respuesta: 'no-desea' })
    expect((await respuestas(b.asignacion.id))?.respuesta).toBe('no-desea')
  })
})

describe('las plantillas de correo no llevan imágenes', () => {
  it('ni se suben ni se sirven en una dirección pública', async () => {
    const api = await como()
    const creada = await api.post('/plantillas', { revista: 'reep', nombre: `Sin imagen ${unico()}`, fin: 'mensaje' })
    for (const parte of ['encabezado', 'pie', 'firma']) {
      expect((await api.subir(`/plantillas/${creada.body.id}/imagen/${parte}`, PNG, 'firma.png')).status).toBe(409)
    }
    expect(creada.body).not.toHaveProperty('imagenPie')
    expect((await request(app).get(`/api/imagenes/plantillas/${creada.body.id}/pie?f=abc`)).status).not.toBe(200)
    await api.delete(`/plantillas/${creada.body.id}`)
  })
})

/** Pares que aceptan y entregan con los conceptos dados, uno después del otro. */
async function evaluar(articulo: string, conceptos: string[], desde: number) {
  const api = await como()
  for (const [i, concepto] of conceptos.entries()) {
    const p = await candidato(articulo, desde + i)
    await api.post(`/reep/asignaciones/${p.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    const r = await api.post(`/reep/asignaciones/${p.asignacion.id}/entrega`, { fecha: hoy(), concepto })
    expect(r.status).toBe(200)
  }
  return (await api.get(`/reep/articulos/${articulo}`)).body as { estado: string; resultadoPares: string | null }
}

describe('el resultado del artículo según los conceptos de los pares', () => {
  it('dos pares «no publicable» cierran el proceso: el artículo queda rechazado', async () => {
    const art = await articuloAprobado()
    const ficha = await evaluar(art.id, ['no-publicable', 'no-publicable'], 30)
    expect(ficha).toMatchObject({ estado: 'rechazado', resultadoPares: 'no-publicable' })
  })

  it('«publicable con modificaciones» devuelve el artículo al comité para otra ronda', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const ficha = await evaluar(art.id, ['publicable-con-modificaciones', 'publicable-con-modificaciones'], 32)
    expect(ficha).toMatchObject({ estado: 'postulado', resultadoPares: 'publicable-con-modificaciones' })
    // el comité registra la nueva ronda
    const ronda = await api.post(`/reep/articulos/${art.id}/rondas`, {
      coincidencias: 4,
      atribuidoIa: 1,
      resultado: 'aprobado',
      observacion: 'Con los ajustes pedidos por los pares',
    })
    expect(ronda.status).toBe(201)
    expect(ronda.body.rondasComite).toHaveLength(2)
  })

  it('«publicable» aprueba el artículo cuando ya tiene volumen y número; si no, espera que se asignen', async () => {
    const api = await como()
    const con = await articuloAprobado()
    await api.patch(`/reep/articulos/${con.id}`, { publicacion: { volumen: 9, numero: 2 } })
    expect(await evaluar(con.id, ['publicable', 'publicable'], 34)).toMatchObject({ estado: 'aprobado', resultadoPares: 'publicable' })

    const sin = await articuloAprobado()
    const ficha = await evaluar(sin.id, ['publicable', 'publicable'], 36)
    expect(ficha).toMatchObject({ estado: 'en-evaluacion', resultadoPares: 'publicable' })
    const cierre = await api.post(`/reep/articulos/${sin.id}/cerrar`, {
      estado: 'aprobado',
      motivo: 'Los pares lo calificaron como publicable',
      publicacion: { volumen: 9, numero: 3 },
    })
    expect(cierre.status).toBe(200)
  })

  it('con conceptos distintos espera al tercer par y decide por mayoría', async () => {
    const art = await articuloAprobado()
    const ficha = await evaluar(art.id, ['publicable', 'no-publicable'], 38)
    expect(ficha).toMatchObject({ estado: 'en-evaluacion', resultadoPares: null })
    const final = await evaluar(art.id, ['no-publicable'], 40)
    expect(final).toMatchObject({ estado: 'rechazado', resultadoPares: 'no-publicable' })
  })

  it('no decide mientras falte la entrega de un par', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const a = await candidato(art.id, 42)
    const b = await candidato(art.id, 43)
    await api.post(`/reep/asignaciones/${a.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    await api.post(`/reep/asignaciones/${b.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    await api.post(`/reep/asignaciones/${a.asignacion.id}/entrega`, { fecha: hoy(), concepto: 'no-publicable' })
    const ficha = (await api.get(`/reep/articulos/${art.id}`)).body
    expect(ficha).toMatchObject({ estado: 'en-evaluacion', resultadoPares: null })
  })
})

describe('los pares asignados de un artículo', () => {
  it('cuentan solo a quienes aceptaron, no a quienes no aceptaron la invitación', async () => {
    const api = await como()
    const art = await articuloAprobado()
    const a = await candidato(art.id, 44)
    const b = await candidato(art.id, 45)
    await api.post(`/reep/asignaciones/${a.asignacion.id}/respuesta`, { respuesta: 'no-acepto' })
    await api.post(`/reep/asignaciones/${b.asignacion.id}/respuesta`, { respuesta: 'acepto' })
    const c = await candidato(art.id, 46)
    await api.post(`/reep/asignaciones/${c.asignacion.id}/respuesta`, { respuesta: 'no-acepto' })
    const lista = (await api.get('/reep/articulos?porPagina=100')).body.items as Array<{
      id: string
      paresAsignados: number
      paresEntregaron: number
    }>
    const fila = lista.find((x) => x.id === art.id)
    expect(fila).toMatchObject({ paresAsignados: 1, paresEntregaron: 0 })
  })
})
