/*
 * Password links of the mock API: a new account defines its password with the link it receives
 * (RF-40) and a forgotten one is recovered with another (RF-46). Links last 30 minutes and work
 * once (RNF-04).
 */
import { vi } from 'vitest'
import { CONTRASENA_DEMO } from '../seed/credenciales'
import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { EnlaceContrasena, RespuestaEnvioEnlace } from '@/types/acceso'

const token = (enlace: string | undefined) =>
  decodeURIComponent((enlace ?? '').split('token=')[1] ?? '')

function ingresar(correo: string, contrasena: string) {
  return llamar('/auth/login', {
    metodo: 'POST',
    usuario: null,
    cuerpo: { correo, contrasena },
  })
}

describe('password links (mock, RF-40, RF-46)', () => {
  afterEach(() => vi.useRealTimers())

  it('a new account cannot log in until it defines its password with its link', async () => {
    const creado = await json<{ id: string; correo: string } & RespuestaEnvioEnlace>(
      await llamar('/usuarios', {
        metodo: 'POST',
        cuerpo: {
          nombre: 'Laura Peña',
          correo: 'laura.pena@unicesmag.edu.co',
          perfil: 'auxiliar',
        },
      }),
    )
    expect(creado.enlaceDemo).toMatch(/^\/acceso\/contrasena\?token=/)
    // The Administradora never knows the password: not even the demo one works
    expect((await ingresar(creado.correo, CONTRASENA_DEMO)).status).toBe(401)

    const t = token(creado.enlaceDemo)
    const enlace = await json<EnlaceContrasena>(
      await llamar(`/auth/enlaces/${t}`, { usuario: null }),
    )
    expect(enlace).toMatchObject({ motivo: 'activacion', correo: 'laura.pena@unicesmag.edu.co' })

    const definir = (contrasena: string) =>
      llamar(`/auth/enlaces/${t}`, { metodo: 'POST', usuario: null, cuerpo: { contrasena } })
    expect((await definir('corta1')).status).toBe(422)
    expect((await definir('sinnumeros')).status).toBe(422)
    expect((await definir('Revistas2027')).status).toBe(204)
    expect((await ingresar(creado.correo, 'Revistas2027')).status).toBe(200)
    // Single use
    expect((await definir('OtraClave2027')).status).toBe(410)
  })

  it('recovery: a link for an existing account, never a hint for a missing one', async () => {
    const existe = await json<RespuestaEnvioEnlace>(
      await llamar('/auth/recuperar', {
        metodo: 'POST',
        usuario: null,
        cuerpo: { correo: AUXILIAR.correo },
      }),
    )
    expect(existe.enlaceDemo).toBeTruthy()
    const falta = await llamar('/auth/recuperar', {
      metodo: 'POST',
      usuario: null,
      cuerpo: { correo: 'nadie@unicesmag.edu.co' },
    })
    expect(falta.status).toBe(202)

    const t = token(existe.enlaceDemo)
    expect(
      (
        await llamar(`/auth/enlaces/${t}`, {
          metodo: 'POST',
          usuario: null,
          cuerpo: { contrasena: 'Nueva2027clave' },
        })
      ).status,
    ).toBe(204)
    expect((await ingresar(AUXILIAR.correo, CONTRASENA_DEMO)).status).toBe(401)
    expect((await ingresar(AUXILIAR.correo, 'Nueva2027clave')).status).toBe(200)
  })

  it('a link expires after 30 minutes, and a newer link replaces the older one', async () => {
    const pedir = async () =>
      token(
        (
          await json<RespuestaEnvioEnlace>(
            await llamar('/auth/recuperar', {
              metodo: 'POST',
              usuario: null,
              cuerpo: { correo: AUXILIAR.correo },
            }),
          )
        ).enlaceDemo,
      )
    const primero = await pedir()
    const segundo = await pedir()
    expect((await llamar(`/auth/enlaces/${primero}`, { usuario: null })).status).toBe(410)
    expect((await llamar(`/auth/enlaces/${segundo}`, { usuario: null })).status).toBe(200)

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() + 31 * 60_000))
    const vencido = await llamar(`/auth/enlaces/${segundo}`, { usuario: null })
    expect(vencido.status).toBe(410)
    expect(await json<{ motivo: string }>(vencido)).toEqual({ motivo: 'vencido' })
    expect((await llamar('/auth/enlaces/no-existe', { usuario: null })).status).toBe(404)
  })

  it('the Administradora can send the link again; the Auxiliar cannot', async () => {
    expect(
      (await llamar('/usuarios/u-2/enlace', { metodo: 'POST', usuario: AUXILIAR })).status,
    ).toBe(403)
    const r = await llamar('/usuarios/u-2/enlace', { metodo: 'POST' })
    expect(r.status).toBe(202)
    expect((await json<RespuestaEnvioEnlace>(r)).enlaceDemo).toBeTruthy()
  })
})
