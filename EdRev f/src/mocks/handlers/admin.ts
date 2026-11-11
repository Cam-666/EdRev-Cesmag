/*
 * MSW handlers for Administración: user accounts, mail / constancia templates (edit, create a new
 * one for a use and choose the one in use) with the sender address of each journal, and the
 * cross-journal audit log. Administradora only (RNF-05).
 * Covers: RF-40, RF-41, RNF-07 (credentials are never returned), RNF-19, HU-29, HU-30.
 */
import { http, HttpResponse } from 'msw'
import { baseDe, cuentas, plantillas, usuarios } from '../db'
import { contextoGlobal, error, sinTildes } from './util'
import { marcadores } from '@/lib/plantillas'
import type { EntradaAuditoria } from '@/types/historial'
import type { DatosNuevaPlantilla, Plantilla, UsoPlantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
import type { DatosUsuario, Usuario } from '@/types/usuario'

/** Markers every template must keep, or its mail / constancia loses the data it exists for. */
const OBLIGATORIOS: Record<UsoPlantilla, string[]> = {
  invitacion: ['par', 'articulo'],
  agradecimiento: ['par', 'articulo'],
  constancia: ['nombrePar', 'articulo'],
}

const USOS: readonly UsoPlantilla[] = ['invitacion', 'agradecimiento', 'constancia']

function validarPlantilla(
  p: Pick<Plantilla, 'uso' | 'variables'>,
  asunto: string | null,
  cuerpo: string,
): string | null {
  const usados = [...marcadores(cuerpo), ...marcadores(asunto ?? '')]
  const desconocido = usados.find((m) => !p.variables.includes(m))
  if (desconocido) return `El marcador {{${desconocido}}} no existe en esta plantilla`
  const falta = OBLIGATORIOS[p.uso].find((m) => !marcadores(cuerpo).includes(m))
  if (falta) return `Falta el marcador obligatorio {{${falta}}}`
  if (!cuerpo.trim()) return 'El texto no puede estar vacío'
  return null
}

function filaAuditoria(r: Revista, e: EntradaAuditoria) {
  return { ...e, revista: r }
}

export const handlersAdmin = [
  http.get('*/api/usuarios', ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    return HttpResponse.json(usuarios())
  }),

  http.post('*/api/usuarios', async ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as DatosUsuario
    if (!datos.nombre.trim()) return error(422, 'Escriba el nombre')
    if (!/^[^\s@]+@unicesmag\.edu\.co$/i.test(datos.correo.trim())) {
      return error(422, 'Use un correo institucional @unicesmag.edu.co')
    }
    if (usuarios().some((u) => u.correo.toLowerCase() === datos.correo.trim().toLowerCase())) {
      return error(409, 'Ya existe una cuenta con ese correo')
    }
    const nuevo: Usuario = {
      id: `u-n${usuarios().length + 1}`,
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim().toLowerCase(),
      perfil: datos.perfil,
      estado: 'activo',
      ultimoIngreso: null,
    }
    usuarios().push(nuevo)
    return HttpResponse.json(nuevo, { status: 201 })
  }),

  http.patch('*/api/usuarios/:id', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const usuario = usuarios().find((u) => u.id === params.id)
    if (!usuario) return error(404, 'Usuario no encontrado')
    const cambios = (await request.json()) as Partial<DatosUsuario & Pick<Usuario, 'estado'>>
    const quedaria = { ...usuario, ...cambios }
    const ultimaAdmin =
      usuario.perfil === 'administrador' &&
      usuario.estado === 'activo' &&
      (quedaria.perfil !== 'administrador' || quedaria.estado !== 'activo') &&
      usuarios().filter((u) => u.perfil === 'administrador' && u.estado === 'activo').length <= 1
    if (ultimaAdmin) return error(409, 'Debe quedar al menos una administradora activa')
    if (cambios.correo && !/^[^\s@]+@unicesmag\.edu\.co$/i.test(cambios.correo.trim())) {
      return error(422, 'Use un correo institucional @unicesmag.edu.co')
    }
    // An inhabilitated account keeps its history: only its status changes (HU-29).
    Object.assign(usuario, cambios)
    return HttpResponse.json(usuario)
  }),

  http.get('*/api/plantillas', ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    return HttpResponse.json({ plantillas: plantillas(), cuentas: cuentas() })
  }),

  http.post('*/api/plantillas', async ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const { nombre, uso } = (await request.json()) as DatosNuevaPlantilla
    if (!USOS.includes(uso)) return error(422, 'Uso no válido')
    if (!nombre.trim()) return error(422, 'Escriba el nombre de la plantilla')
    const repetido = plantillas().some(
      (p) => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
    )
    if (repetido) return error(409, 'Ya existe una plantilla con ese nombre')
    // Starts from the text of the template in use, so it is valid from the first moment.
    const modelo = plantillas().find((p) => p.uso === uso && p.enUso)
    if (!modelo) return error(409, 'No hay una plantilla en uso para copiar')
    const nueva: Plantilla = {
      ...modelo,
      variables: [...modelo.variables],
      id: `pl-n${plantillas().length + 1}`,
      nombre: nombre.trim(),
      enUso: false,
    }
    plantillas().push(nueva)
    return HttpResponse.json(nueva, { status: 201 })
  }),

  http.post('*/api/plantillas/:id/usar', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    for (const p of plantillas()) if (p.uso === plantilla.uso) p.enUso = p.id === plantilla.id
    return HttpResponse.json(plantilla)
  }),

  http.put('*/api/plantillas/:id', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    const { asunto, cuerpo } = (await request.json()) as { asunto: string | null; cuerpo: string }
    const fallo = validarPlantilla(plantilla, plantilla.asunto === null ? null : asunto, cuerpo)
    if (fallo) return error(422, fallo)
    if (plantilla.asunto !== null) plantilla.asunto = asunto ?? plantilla.asunto
    plantilla.cuerpo = cuerpo
    return HttpResponse.json(plantilla)
  }),

  http.put('*/api/cuentas/:revista', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const cuenta = cuentas().find((x) => x.revista === params.revista)
    if (!cuenta) return error(404, 'Revista no encontrada')
    const { remitente } = (await request.json()) as { remitente: string }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remitente.trim()))
      return error(422, 'Escriba un correo válido')
    cuenta.remitente = remitente.trim()
    return HttpResponse.json(cuenta)
  }),

  http.get('*/api/auditoria', ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const url = new URL(request.url)
    const revista = url.searchParams.get('revista')
    const usuario = sinTildes(url.searchParams.get('usuario') ?? '')
    const tipo = url.searchParams.get('tipo')
    const pagina = Math.max(1, Number(url.searchParams.get('pagina') ?? 1))
    const porPagina = Math.max(1, Number(url.searchParams.get('porPagina') ?? 10))

    const todas = (['reep', 'ire'] as const)
      .filter((r) => !revista || revista === r)
      .flatMap((r) => baseDe(r).auditoria.map((e) => filaAuditoria(r, e)))
      .filter((e) => !usuario || sinTildes(e.usuario).includes(usuario))
      .filter((e) => !tipo || e.tipo === tipo)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
    return HttpResponse.json({
      items: todas.slice((pagina - 1) * porPagina, pagina * porPagina),
      total: todas.length,
    })
  }),
]
