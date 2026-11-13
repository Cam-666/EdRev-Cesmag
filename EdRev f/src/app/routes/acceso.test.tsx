import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { axe } from 'vitest-axe'
import { vi } from 'vitest'
import { rutas } from '.'
import { Proveedores } from '../Proveedores'
import { CONTRASENA_DEMO } from '@/mocks/seed/credenciales'
import { ADMINISTRADORA, AUXILIAR, AUXILIAR_INHABILITADA } from '@/mocks/seed/usuarios'
import type { Usuario } from '@/types/usuario'

const ADMIN = ADMINISTRADORA
const INHABILITADA = AUXILIAR_INHABILITADA

function montar(ruta: string, usuario: Usuario | null = null) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  const vista = render(
    <Proveedores usuarioInicial={usuario}>
      <RouterProvider router={router} />
    </Proveedores>,
  )
  return { router, user: userEvent.setup(), ...vista }
}

async function ingresar(
  user: ReturnType<typeof userEvent.setup>,
  correo: string,
  contrasena: string,
) {
  await user.clear(screen.getByLabelText('Correo institucional'))
  await user.type(screen.getByLabelText('Correo institucional'), correo)
  await user.type(screen.getByLabelText('Contraseña'), contrasena)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('login (/acceso)', () => {
  it('shows the Figma texts and has no accessibility violations', async () => {
    const { container } = montar('/acceso')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sistema de Gestión Editorial' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ingrese con su correo institucional')).toBeInTheDocument()
    expect(screen.getByText('EdRev Cesmag')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo institucional')).toHaveAttribute(
      'placeholder',
      'nombre.apellido@unicesmag.edu.co',
    )
    // RNF-05 / D15: there is no "keep me signed in"
    expect(screen.queryByRole('checkbox', { name: /Mantener la sesión/ })).toBeNull()
    expect(screen.getByRole('link', { name: '¿Olvidó su contraseña?' })).toHaveAttribute(
      'href',
      '/acceso/recuperar',
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('validates required fields and the institutional domain, linking errors to the fields', async () => {
    const { user } = montar('/acceso')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    const correo = screen.getByLabelText('Correo institucional')
    expect(correo).toHaveAttribute('aria-invalid', 'true')
    expect(await screen.findByText('Escriba su correo institucional.')).toBeInTheDocument()
    expect(screen.getByText('Escriba su contraseña.')).toBeInTheDocument()
    expect(correo).toHaveFocus()

    await user.type(correo, 'alguien@gmail.com')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText(/Use su correo institucional/)).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    const { user } = montar('/acceso')
    const campo = screen.getByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: /Mostrar/ }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /Ocultar/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('wrong password shows the attempt counter', async () => {
    const { user } = montar('/acceso')
    await ingresar(user, ADMIN.correo, 'incorrecta')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos. Intento 1 de 3; al tercero la cuenta se bloquea 15 minutos.',
    )
  })

  it('locks the account for 15 minutes after the third failed attempt', async () => {
    const { user } = montar('/acceso')
    for (let i = 1; i <= 3; i++) {
      await ingresar(user, ADMIN.correo, `mala${i}`)
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
      if (i < 3)
        await waitFor(() =>
          expect(screen.getByRole('alert')).toHaveTextContent(`Intento ${i} de 3`),
        )
    }
    expect(await screen.findByText(/Cuenta bloqueada por 15 minutos/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled()
  })

  it('a disabled account cannot log in', async () => {
    const { user } = montar('/acceso')
    await ingresar(user, INHABILITADA.correo, CONTRASENA_DEMO)
    expect(await screen.findByText(/cuenta está inhabilitada/)).toBeInTheDocument()
  })

  it('logs in and goes to /inicio', async () => {
    const { user, router } = montar('/acceso')
    await ingresar(user, ADMIN.correo, CONTRASENA_DEMO)
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'))
    expect(await screen.findByText('Ma. Camila Mendoza')).toBeInTheDocument()
    expect(window.sessionStorage.getItem('edrev.sesion')).toContain(ADMIN.correo)
  })

  it('returns to the page the user was trying to open', async () => {
    const { user, router } = montar('/ire/articulos')
    expect(router.state.location.pathname).toBe('/acceso')
    await ingresar(user, AUXILIAR.correo, CONTRASENA_DEMO)
    await waitFor(() => expect(router.state.location.pathname).toBe('/ire/articulos'))
  })
})

describe('session expiry (RNF-05)', () => {
  afterEach(() => vi.useRealTimers())

  it('closes the session after 30 minutes of inactivity and offers to resume', async () => {
    vi.useFakeTimers()
    const { router } = montar('/reep/tablero', ADMIN)
    expect(router.state.location.pathname).toBe('/reep/tablero')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30 * 60_000 + 10)
    })

    expect(router.state.location.pathname).toBe('/acceso')
    expect(screen.getByRole('heading', { level: 1, name: 'Su sesión expiró' })).toBeInTheDocument()
    expect(screen.getByText(/Sesión cerrada por 30 minutos de inactividad/)).toBeInTheDocument()
    expect(screen.getByLabelText('Correo institucional')).toHaveValue(ADMIN.correo)
    expect(screen.getByRole('button', { name: 'Reanudar sesión' })).toBeInTheDocument()
  })

  it('user activity postpones the logout', async () => {
    vi.useFakeTimers()
    const { router } = montar('/inicio', ADMIN)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(29 * 60_000)
      window.dispatchEvent(new Event('keydown'))
      await vi.advanceTimersByTimeAsync(29 * 60_000)
    })
    expect(router.state.location.pathname).toBe('/inicio')
  })
})

describe('password recovery', () => {
  afterEach(() => vi.useRealTimers())

  it('request screen matches the design and is accessible', async () => {
    const { container } = montar('/acceso/recuperar')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Recuperar contraseña' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Le enviaremos un enlace para crear una contraseña nueva'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute(
      'href',
      '/acceso',
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it('sends the link and shows the confirmation with a masked address', async () => {
    const { user, router } = montar('/acceso/recuperar')
    await user.type(screen.getByLabelText('Correo institucional'), 'maria.lopez@unicesmag.edu.co')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/acceso/recuperar/enviado'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revise su correo' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Enlace enviado a m·····z@unicesmag\.edu\.co/)).toBeInTheDocument()
    expect(screen.getByText(/Caduca en 30 minutos y solo puede usarse una vez/)).toBeInTheDocument()
    expect(screen.queryByText(/maria\.lopez@/)).toBeNull()
  })

  it('without a requested address the confirmation redirects back', () => {
    const { router } = montar('/acceso/recuperar/enviado')
    expect(router.state.location.pathname).toBe('/acceso/recuperar')
  })

  it('resend is locked for 45 s, then enabled, and confirms with a status message', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { router } = montar('/acceso/recuperar')
    await act(async () => {
      await router.navigate('/acceso/recuperar/enviado', {
        state: { correo: 'maria.lopez@unicesmag.edu.co' },
      })
    })

    const boton = screen.getByRole('button', { name: /Reenviar el enlace/ })
    expect(boton).toBeDisabled()
    expect(boton).toHaveTextContent('Reenviar el enlace (disponible en 00:45)')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(46_000)
    })

    const habilitado = screen.getByRole('button', { name: 'Reenviar el enlace' })
    expect(habilitado).toBeEnabled()
    await act(async () => {
      habilitado.click()
    })
    await waitFor(() => expect(screen.getByText('Enlace reenviado.')).toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: /Reenviar el enlace \(disponible en/ }),
    ).toBeDisabled()
  })
})

describe('defining a password from the mail link (RF-40, RF-46)', () => {
  afterEach(() => vi.useRealTimers())

  it('recovery: the link opens the form, validates it and the new password works', async () => {
    const { user, router } = montar('/acceso/recuperar')
    await user.type(screen.getByLabelText('Correo institucional'), AUXILIAR.correo)
    await user.click(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }))
    await user.click(
      await screen.findByRole('link', { name: 'Demostración: abrir el enlace del correo' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/acceso/contrasena'))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cree una contraseña nueva' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Andrea Villota/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta')
    await user.type(screen.getByLabelText('Confirme la contraseña'), 'otra')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Use al menos 8 caracteres.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Nueva contraseña'))
    await user.type(screen.getByLabelText('Nueva contraseña'), 'Revistas2027')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(await screen.findByText('Las dos contraseñas no coinciden.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Confirme la contraseña'))
    await user.type(screen.getByLabelText('Confirme la contraseña'), 'Revistas2027')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/acceso'))
    expect(await screen.findByText('Contraseña guardada. Ya puede ingresar.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo institucional')).toHaveValue(AUXILIAR.correo)

    await user.type(screen.getByLabelText('Contraseña'), 'Revistas2027')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/inicio'))
  })

  it('an expired, used or wrong link says so and offers a new one', async () => {
    const r = await fetch('http://localhost/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: AUXILIAR.correo }),
    })
    const { enlaceDemo } = (await r.json()) as { enlaceDemo: string }

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() + 31 * 60_000))
    const vencido = montar(enlaceDemo)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'El enlace venció' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Solicitar un enlace nuevo' })).toHaveAttribute(
      'href',
      '/acceso/recuperar',
    )
    vencido.unmount()
    vi.useRealTimers()

    montar('/acceso/contrasena?token=no-existe')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument()
  })

  it('the form has no accessibility violations', async () => {
    const r = await fetch('http://localhost/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: ADMIN.correo }),
    })
    const { enlaceDemo } = (await r.json()) as { enlaceDemo: string }
    const { container } = montar(enlaceDemo)
    await screen.findByRole('heading', { level: 1, name: 'Cree una contraseña nueva' })
    expect(await axe(container)).toHaveNoViolations()
  })
})
