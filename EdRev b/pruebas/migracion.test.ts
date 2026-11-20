/*
 * Pruebas de la migración del Excel
 */
import { describe, expect, it } from 'vitest'
import { enTransaccion } from '../src/db.js'
import { migrarFilas, repartirPorRevista, revistaDeFila } from '../src/servicios/migracion.js'
import { como } from './api.js'

const filas = [
  {
    'N.º OJS': 'M-100',
    'Título': 'Pedagogía rural en Nariño',
    'Tipo de artículo': 'Artículo de investigación',
    'Fecha de postulación': '15/03/2024',
    Estado: 'Aprobado',
    Autores: 'Ana Pérez; Luis Mora',
    Par: 'Par Uno',
    'Correo par': 'Par.Uno@udenar.edu.co',
    Concepto: 'Publicable con modificaciones',
    'Fecha de entrega': '2024-05-02',
    CONSTANCIA: 'SI',
  },
  {
    'N.º OJS': 'M-100',
    Título: 'Pedagogía rural en Nariño',
    Par: 'Par Dos',
    'Correo par': 'sin arroba',
    Concepto: 'Publicable con ajustes menores',
    'Fecha de entrega': '2024-05-09',
  },
  {
    'N.º OJS': 'M-101',
    Título: 'Un artículo con datos raros',
    'Tipo de artículo': 'Artículo corto',
    Estado: 'En espera del autor',
    Autores: 'Ana Pérez',
  },
  { Título: 'Fila sin número de OJS' },
]

describe('migración del Excel', () => {
  it('carga artículos, autores, pares y evaluaciones; lo que no encaja queda por corregir', async () => {
    const resumen = await enTransaccion((c) => migrarFilas(c, 1, filas))
    expect(resumen).toMatchObject({ articulos: 2, omitidos: 0, pares: 2, evaluaciones: 2, porCorregir: 4 })
    expect(resumen.advertencias).toHaveLength(1)

    const api = await como()
    const lista = (await api.get('/reep/por-corregir')).body as Array<{ id: string; campo: string; valorExcel: string; descripcion: string; enlace: string }>
    expect(lista.map((r) => r.campo).sort()).toEqual(['concepto', 'correo-par', 'estado-articulo', 'tipo-articulo'])
    expect(lista.find((r) => r.campo === 'concepto')).toMatchObject({ valorExcel: 'Publicable con ajustes menores' })
    expect(lista.find((r) => r.campo === 'concepto')?.descripcion).toContain('M-100 · Pedagogía rural en Nariño · par 2')
    expect(lista.find((r) => r.campo === 'correo-par')?.enlace).toMatch(/^\/reep\/pares\/\d+$/)

    // La otra revista no ve nada, y el tablero los cuenta.
    expect((await api.get('/ire/por-corregir')).body).toEqual([])
    expect((await api.get('/reep/tablero')).body.porCorregir).toBe(lista.length)
  })

  it('conserva la marca de la constancia y el origen «migrado»', async () => {
    const api = await como()
    const { pendientes, emitidas } = (await api.get('/reep/constancias')).body
    const emitida = emitidas.find((f: { articulo: { numeroOjs: string } }) => f.articulo.numeroOjs === 'M-100')
    expect(emitida).toMatchObject({ origen: 'migrado', fechaEntrega: '2024-05-02' })
    const pendiente = pendientes.find((f: { articulo: { numeroOjs: string } }) => f.articulo.numeroOjs === 'M-100')
    expect(pendiente).toMatchObject({ origen: 'migrado', par: { nombre: 'Par Dos' } })
  })

  it('volver a cargar el mismo archivo no duplica nada', async () => {
    const resumen = await enTransaccion((c) => migrarFilas(c, 1, filas))
    expect(resumen).toMatchObject({ articulos: 0, omitidos: 2, evaluaciones: 0, porCorregir: 0 })
  })

  it('se corrige desde la interfaz: valida, escribe el dato y lo saca de la lista', async () => {
    const api = await como()
    const lista = (await api.get('/reep/por-corregir')).body as Array<{ id: string; campo: string; enlace: string }>
    const de = (campo: string) => lista.find((r) => r.campo === campo)
    const tipo = de('tipo-articulo')
    const concepto = de('concepto')
    const correo = de('correo-par')
    if (!tipo || !concepto || !correo) throw new Error('faltan registros por corregir')

    expect((await api.post(`/reep/por-corregir/${tipo.id}`, { valor: 'otro' })).status).toBe(422)
    expect((await api.post(`/reep/por-corregir/${tipo.id}`, { valor: 'reflexion' })).status).toBe(204)
    expect((await api.post(`/reep/por-corregir/${concepto.id}`, { valor: 'publicable-con-modificaciones' })).status).toBe(204)
    expect((await api.post(`/reep/por-corregir/${correo.id}`, { valor: 'correo malo' })).status).toBe(422)
    expect((await api.post(`/reep/por-corregir/${correo.id}`, { valor: 'par.uno@udenar.edu.co' })).status).toBe(409)
    expect((await api.post(`/reep/por-corregir/${correo.id}`, { valor: 'par.dos@udenar.edu.co' })).status).toBe(204)
    expect((await api.post(`/reep/por-corregir/${tipo.id}`, { valor: 'reflexion' })).status).toBe(404)

    const restantes = (await api.get('/reep/por-corregir')).body as unknown[]
    expect(restantes).toHaveLength(lista.length - 3)
    expect((await api.get(tipo.enlace)).body.tipo).toBe('reflexion')
    const historial = (await api.get(`/auditoria?tipo=edicion&porPagina=20`)).body.items as Array<{ accion: string }>
    expect(historial.some((a) => a.accion.startsWith('Corrigió un dato migrado'))).toBe(true)
  })

  it('un archivo con las dos revistas mezcladas se reparte por la columna «Revista»', async () => {
    expect(revistaDeFila({ Revista: 'REEP' })).toBe(1)
    expect(revistaDeFila({ revista: 'Revista Electrónica en Educación y Pedagogía' })).toBe(1)
    expect(revistaDeFila({ Revista: 'Investigium IRE' })).toBe(2)
    expect(revistaDeFila({ Revista: 'otra' })).toBeNull()

    const mezcla = [
      { Revista: 'REEP', 'N.º OJS': 'X-1', Título: 'De la primera', Tipo: 'Reflexión' },
      { Revista: 'IRE', 'N.º OJS': 'X-1', Título: 'Mismo número, otra revista', Tipo: 'Revisión' },
      { 'N.º OJS': 'X-2', Título: 'Sin revista' },
    ]
    const { porRevista, sinRevista } = repartirPorRevista(mezcla)
    expect(sinRevista).toBe(1)
    const a = await enTransaccion((c) => migrarFilas(c, 1, porRevista.get(1) ?? []))
    const b = await enTransaccion((c) => migrarFilas(c, 2, porRevista.get(2) ?? []))
    expect([a.articulos, b.articulos]).toEqual([1, 1])
    const api = await como()
    expect((await api.get('/ire/articulos/existe?numeroOjs=X-1')).body.existe).toBe(true)
    expect((await api.get('/reep/articulos/existe?numeroOjs=X-1')).body.existe).toBe(true)
  })
})
