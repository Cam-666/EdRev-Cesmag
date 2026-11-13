/*
 * api — test helper: the Express app in memory (supertest) and a session per profile.
 */
import request from 'supertest'
import { crearApp } from '../src/app.js'

export const app = crearApp()

export const ADMIN = { correo: 'maria.mendoza@unicesmag.edu.co', contrasena: 'Editorial2026*' }
export const AUXILIAR = { correo: 'andrea.villota@unicesmag.edu.co', contrasena: 'Editorial2026*' }

const tokens = new Map<string, string>()

export async function sesion(cuenta = ADMIN): Promise<string> {
  const guardado = tokens.get(cuenta.correo)
  if (guardado) return guardado
  const r = await request(app).post('/api/auth/login').send(cuenta)
  if (r.status !== 200) throw new Error(`login ${r.status} ${JSON.stringify(r.body)}`)
  tokens.set(cuenta.correo, r.body.token)
  return r.body.token as string
}

/** Authorized request as the given account (Administradora by default). */
export async function como(cuenta = ADMIN) {
  const token = await sesion(cuenta)
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`)
  return {
    get: (ruta: string) => auth(request(app).get(`/api${ruta}`)),
    post: (ruta: string, cuerpo?: object) => auth(request(app).post(`/api${ruta}`)).send(cuerpo ?? {}),
    put: (ruta: string, cuerpo?: object) => auth(request(app).put(`/api${ruta}`)).send(cuerpo ?? {}),
    patch: (ruta: string, cuerpo?: object) => auth(request(app).patch(`/api${ruta}`)).send(cuerpo ?? {}),
  }
}

let secuencia = 0
/** An article approved by the committee, ready for peers. */
export async function articuloAprobado(revista: 'reep' | 'ire' = 'reep') {
  const api = await como()
  secuencia += 1
  const art = await api.post(`/${revista}/articulos`, {
    numeroOjs: `T-${Date.now()}-${secuencia}`,
    titulo: `Artículo de prueba ${secuencia}`,
    tipo: 'investigacion',
    fechaPostulacion: '2026-10-01',
    autores: [{ nuevo: { nombre: `Autora ${secuencia}`, correo: '', orcid: '', filiacion: 'Universidad de Nariño', pais: 'Colombia' } }],
  })
  if (art.status !== 201) throw new Error(JSON.stringify(art.body))
  await api.post(`/${revista}/articulos/${art.body.id}/rondas`, {
    coincidencias: 5,
    atribuidoIa: 1,
    resultado: 'aprobado',
    observacion: '',
  })
  return art.body as { id: string }
}

export async function candidato(articulo: string, n: number, revista: 'reep' | 'ire' = 'reep') {
  const api = await como()
  const r = await api.post(`/${revista}/articulos/${articulo}/asignaciones`, {
    nuevo: {
      nombre: `Candidato ${articulo}-${n}`,
      profesion: 'Magíster',
      correo: `c${n}.${articulo}@udenar.edu.co`.toLowerCase(),
      universidad: 'Universidad Mariana',
      area: 'Educación',
    },
  })
  if (r.status !== 201) throw new Error(JSON.stringify(r.body))
  return r.body as { asignacion: { id: string }; par: { id: string } }
}
