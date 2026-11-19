/*
 * MSW handlers for Administración: user accounts, the mail / constancia templates of each journal
 * (edit, create a new one of a class, choose the one in use, upload the header, footer and
 * signature images of the constancia), the ISSN and indexations of each journal, and the
 * cross-journal audit log. Administradora only (RNF-05).
 * Covers: RF-40, RF-41, RNF-07 (credentials are never returned), RNF-19, HU-29, HU-30.
 */
import { http, HttpResponse } from 'msw'
import { baseDe, configuracion, plantillas, usuarios } from '../db'
import { bloquearContrasena, crearEnlace } from './acceso'
import { contextoGlobal, error, sinTildes } from './util'
import { marcadores } from '@/lib/plantillas'
import type { RespuestaEnvioEnlace } from '@/types/acceso'
import type { EntradaAuditoria } from '@/types/historial'
import type { DatosNuevaPlantilla, ParteImagen, Plantilla, UsoPlantilla } from '@/types/plantilla'

const FIN_TEXTO: Record<UsoPlantilla, string> = {
  invitacion: 'la invitación a evaluar',
  agradecimiento: 'el agradecimiento',
  constancia: 'la constancia',
}
import type { Revista } from '@/types/revista'
import type { DatosUsuario, Usuario } from '@/types/usuario'

/** Markers every template must keep, or its mail / constancia loses the data it exists for. */

/** Markers each use accepts; a template without a use accepts those of its class. */
const VARIABLES: Record<UsoPlantilla, string[]> = {
  invitacion: ['revista', 'numero', 'par', 'profesion', 'universidad', 'articulo', 'botones'],
  agradecimiento: ['revista', 'par', 'articulo'],
  constancia: ['revista', 'REVISTA', 'par', 'PAR', 'articulo', 'issn', 'indexaciones', 'fecha', 'anio', 'firma'],
}

const PARTES: readonly ParteImagen[] = ['encabezado', 'pie', 'firma']
const MAX_IMAGEN = 2 * 1024 * 1024

function validarPlantilla(
  permitidos: string[],
  asunto: string | null,
  cuerpo: string,
): string | null {
  const usados = [...marcadores(cuerpo), ...marcadores(asunto ?? '')]
  const desconocido = usados.find((m) => !permitidos.includes(m))
  if (desconocido) return `El marcador {{${desconocido}}} no existe en esta plantilla`
  if (!cuerpo.trim()) return 'El texto no puede estar vacío'
  return null
}

function filaAuditoria(r: Revista, e: EntradaAuditoria) {
  return { ...e, revista: r }
}

export const handlersAdmin = [
  http.get('*/api/configuracion', ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    return HttpResponse.json(configuracion())
  }),

  http.put('*/api/configuracion', async ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const { diasEspera } = (await request.json()) as { diasEspera: number }
    if (!Number.isFinite(diasEspera) || diasEspera < 1 || diasEspera > 60) {
      return error(422, 'Escriba entre 1 y 60 días')
    }
    configuracion().diasEspera = diasEspera
    return HttpResponse.json(configuracion())
  }),

  http.put('*/api/configuracion/revistas/:revista', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const revista = params.revista as Revista
    if (revista !== 'reep' && revista !== 'ire') return error(404, 'Revista no encontrada')
    const { issn, indexaciones } = (await request.json()) as { issn: string; indexaciones: string }
    if (!/^(\d{4}-\d{3}[\dXx])?$/.test(issn.trim())) return error(422, 'El ISSN tiene la forma 1234-567X')
    if (indexaciones.length > 1500) return error(422, 'Máximo 1500 caracteres')
    configuracion().revistas[revista] = {
      ...configuracion().revistas[revista],
      issn: issn.trim().toUpperCase(),
      indexaciones: indexaciones.trim(),
    }
    return HttpResponse.json(configuracion().revistas[revista])
  }),

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
    // RF-40: the Administradora never sets passwords; the user defines one with this link.
    bloquearContrasena(nuevo.id)
    const enlaceDemo = crearEnlace(nuevo.id, 'activacion')
    return HttpResponse.json({ ...nuevo, enlaceDemo }, { status: 201 })
  }),

  http.delete('*/api/usuarios/:id', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const usuario = usuarios().find((u) => u.id === params.id)
    if (!usuario) return error(404, 'Usuario no encontrado')
    if (usuario.id === c.usuario.id) return error(409, 'No puede eliminar su propia cuenta')
    if (
      usuario.perfil === 'administrador' &&
      usuario.estado === 'activo' &&
      usuarios().filter((u) => u.perfil === 'administrador' && u.estado === 'activo').length <= 1
    ) {
      return error(409, 'Debe quedar al menos una administradora activa')
    }
    // An account that already entered has activity in the history and cannot disappear from it.
    if (usuario.ultimoIngreso) {
      return error(
        409,
        'La cuenta tiene actividad registrada y no se puede eliminar; inhabilítela en su lugar',
      )
    }
    usuarios().splice(usuarios().indexOf(usuario), 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/usuarios/:id/enlace', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const usuario = usuarios().find((u) => u.id === params.id)
    if (!usuario) return error(404, 'Usuario no encontrado')
    if (usuario.estado !== 'activo') return error(409, 'La cuenta está inhabilitada')
    const cuerpo: RespuestaEnvioEnlace = { enlaceDemo: crearEnlace(usuario.id, 'activacion') }
    return HttpResponse.json(cuerpo, { status: 202 })
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
    return HttpResponse.json({ plantillas: plantillas() })
  }),

  http.post('*/api/plantillas', async ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const datos = (await request.json()) as DatosNuevaPlantilla
    const { revista, nombre, uso, usarAhora } = datos
    const clase = uso ? (uso === 'constancia' ? 'archivo' : 'correo') : datos.clase
    if (revista !== 'reep' && revista !== 'ire') return error(422, 'Revista no válida')
    if (clase !== 'correo' && clase !== 'archivo') return error(422, 'Elija para qué se usará la plantilla')
    if (!nombre.trim()) return error(422, 'Escriba el nombre de la plantilla')
    const repetido = plantillas().some(
      (p) => p.revista === revista && p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase(),
    )
    if (repetido) return error(409, 'Ya existe una plantilla con ese nombre en esta revista')
    // With a use it starts as a copy of the one in use for it; without one it is blank.
    const id = `${revista}-pl-n${plantillas().length + 1}`
    const origen = uso ? plantillas().find((p) => p.revista === revista && p.uso === uso) : undefined
    // What it is for does not change; the data it accepts depend on it.
    const fin: UsoPlantilla = uso ?? (clase === 'archivo' ? 'constancia' : 'invitacion')
    const nueva: Plantilla = origen
      ? {
          ...origen,
          id,
          nombre: nombre.trim(),
          fin: origen.fin,
          uso: null,
          enUso: false,
          variables: [...VARIABLES[origen.fin]],
          imagenes: origen.imagenes ? { ...origen.imagenes } : null,
        }
      : {
      id,
      revista,
      uso: null,
      fin,
      clase,
      nombre: nombre.trim(),
      asunto: clase === 'correo' ? '' : null,
      cuerpo: '',
      variables: [...VARIABLES[fin]],
      enUso: false,
      imagenes: clase === 'archivo' ? { encabezado: null, pie: null, firma: null } : null,
    }
    plantillas().push(nueva)
    if (usarAhora && uso && origen) {
      origen.uso = null
      origen.enUso = false
      nueva.uso = uso
      nueva.enUso = true
    }
    return HttpResponse.json(nueva, { status: 201 })
  }),

  http.post('*/api/plantillas/:id/asignar', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    const { uso } = (await request.json()) as { uso: UsoPlantilla }
    // A template is chosen only for the purpose it was created for.
    if (uso !== plantilla.fin) {
      return error(409, `Esta plantilla es para ${FIN_TEXTO[plantilla.fin]} y no puede usarse para ${FIN_TEXTO[uso]}`)
    }
    if (!plantilla.cuerpo.trim()) {
      return error(422, 'La plantilla aún no tiene texto: redáctela en Plantillas antes de elegirla')
    }
    const fallo = validarPlantilla(VARIABLES[uso], plantilla.asunto, plantilla.cuerpo)
    if (fallo) return error(422, fallo)
    for (const p of plantillas()) {
      if (p.revista === plantilla.revista && p.uso === uso) {
        p.uso = null
        p.enUso = false
      }
    }
    plantilla.uso = uso
    plantilla.enUso = true
    return HttpResponse.json(plantilla)
  }),

  http.delete('*/api/plantillas/:id', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    if (plantilla.uso) {
      return error(409, 'La plantilla está en uso; elija otra en Configuración antes de eliminarla')
    }
    plantillas().splice(plantillas().indexOf(plantilla), 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // RF-45: the constancia template carries a header, a footer and a signature image.
  http.post('*/api/plantillas/:id/imagen/:parte', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    const parte = PARTES.find((x) => x === params.parte)
    if (!parte) return error(404, 'Parte de la plantilla no válida')
    // Only the file template (the constancia) has images; a mail template has none.
    if (!plantilla.imagenes) return error(409, 'Solo la plantilla de archivo (la constancia) lleva imágenes')
    const archivo = (await request.formData()).get('archivo')
    if (archivo === null || typeof archivo === 'string') return error(422, 'Adjunte la imagen')
    const esImagen = /\.(png|jpe?g)$/i.test(archivo.name) || /^image\/(png|jpeg)$/.test(archivo.type)
    if (!esImagen) return error(422, 'La imagen debe ser PNG o JPG')
    if (archivo.size > MAX_IMAGEN) return error(422, 'La imagen no puede pasar de 2 MB')
    const imagen = { nombre: archivo.name, tamano: archivo.size }
    plantilla.imagenes[parte] = imagen
    return HttpResponse.json(plantilla)
  }),

  http.delete('*/api/plantillas/:id/imagen/:parte', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    const parte = PARTES.find((x) => x === params.parte)
    if (!parte || !plantilla.imagenes) return error(404, 'Parte de la plantilla no válida')
    plantilla.imagenes[parte] = null
    return HttpResponse.json(plantilla)
  }),

  http.post('*/api/plantillas/vista-correo', async ({ request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const { cuerpo, uso } = (await request.json()) as {
      cuerpo: string
      uso: 'invitacion' | 'agradecimiento'
    }
    // The title says which mail it is.
    const titulo = uso === 'agradecimiento' ? 'Gracias por su evaluación' : 'Invitación a evaluar un artículo'
    return HttpResponse.json({
      html: `<!doctype html><html lang="es"><body><h1>Universidad CESMAG</h1><h2>${titulo}</h2><p>${cuerpo}</p><small>Aviso de datos personales</small></body></html>`,
    })
  }),

  http.post('*/api/plantillas/:id/vista-previa', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    if (!plantilla.imagenes) return error(409, 'Solo la plantilla de archivo tiene vista previa en PDF')
    return new HttpResponse('%PDF-1.4 vista previa de ejemplo', {
      headers: { 'Content-Type': 'application/pdf' },
    })
  }),

  http.get('*/api/plantillas/:id/vista-previa', ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    if (!plantilla.imagenes) return error(409, 'Solo la plantilla de archivo tiene vista previa en PDF')
    return new HttpResponse('%PDF-1.4 vista previa de ejemplo', {
      headers: { 'Content-Type': 'application/pdf' },
    })
  }),

  http.put('*/api/plantillas/:id', async ({ params, request }) => {
    const c = contextoGlobal(request, 'administrar')
    if (!c.ok) return c.respuesta
    const plantilla = plantillas().find((p) => p.id === params.id)
    if (!plantilla) return error(404, 'Plantilla no encontrada')
    const { asunto, cuerpo } = (await request.json()) as {
      asunto: string | null
      cuerpo: string
    }
    const fallo = validarPlantilla(
      plantilla.variables,
      plantilla.asunto === null ? null : asunto,
      cuerpo,
    )
    if (fallo) return error(422, fallo)
    if (plantilla.asunto !== null) plantilla.asunto = asunto ?? plantilla.asunto
    plantilla.cuerpo = cuerpo
    return HttpResponse.json(plantilla)
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
